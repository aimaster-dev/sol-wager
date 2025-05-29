use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Wager, OrderBook, Order, UserPosition, OrderSide, TokenType};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
#[instruction(side: OrderSide, token_type: TokenType)]
pub struct PlaceOrder<'info> {
    #[account(
        seeds = [
            WAGER_SEED,
            wager.wager_id.to_le_bytes().as_ref()
        ],
        bump = wager.bump
    )]
    pub wager: Box<Account<'info, Wager>>,
    
    #[account(
        mut,
        seeds = [ORDER_BOOK_SEED, wager.key().as_ref()],
        bump = order_book.bump
    )]
    pub order_book: Box<Account<'info, OrderBook>>,
    
    #[account(
        mut,
        seeds = [USER_POSITION_SEED, user.key().as_ref(), wager.key().as_ref()],
        bump = user_position.bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key()
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        seeds = [b"escrow", wager.key().as_ref(), token_type.to_seed().as_ref()],
        bump
    )]
    pub escrow_account: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}


pub fn place_order(
    ctx: Context<PlaceOrder>,
    side: OrderSide,
    token_type: TokenType,
    price: u64,
    quantity: u64,
) -> Result<()> {
    let wager = &ctx.accounts.wager;
    let order_book = &mut ctx.accounts.order_book;
    let user_position = &mut ctx.accounts.user_position;
    
    // Validate token account mint matches the token type
    let expected_mint = match token_type {
        TokenType::Yes => wager.yes_mint,
        TokenType::No => wager.no_mint,
    };
    
    if ctx.accounts.user_token_account.mint != expected_mint {
        return Err(IpredictError::InvalidTokenMint.into());
    }
    
    // Initialize escrow account if needed
    if ctx.accounts.escrow_account.data_is_empty() {
        // Create escrow account with proper seeds
        let escrow_seeds = &[
            b"escrow",
            wager.key().as_ref(),
            token_type.to_seed(),
            &[ctx.bumps.escrow_account],
        ];
        
        anchor_lang::system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.escrow_account.to_account_info(),
                },
                &[escrow_seeds],
            ),
            ctx.accounts.rent.minimum_balance(TokenAccount::LEN),
            TokenAccount::LEN as u64,
            &ctx.accounts.token_program.key(),
        )?;
        
        // Initialize token account
        // Need to get mint account info from the wager
        let mint_pubkey = match token_type {
            TokenType::Yes => wager.yes_mint,
            TokenType::No => wager.no_mint,
        };
        
        // Initialize escrow as a token account for the correct mint
        let init_account_ix = spl_token::instruction::initialize_account(
            &spl_token::id(),
            &ctx.accounts.escrow_account.key(),
            &mint_pubkey,
            &ctx.accounts.escrow_account.key(),
        )?;
        
        anchor_lang::solana_program::program::invoke_signed(
            &init_account_ix,
            &[
                ctx.accounts.escrow_account.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
            &[escrow_seeds],
        )?;
    }
    
    // Validate escrow account mint
    if ctx.accounts.escrow_account.mint != expected_mint {
        return Err(IpredictError::InvalidEscrowMint.into());
    }
    
    // Validate inputs
    if price == 0 || price > LAMPORTS_PER_TOKEN {
        return Err(IpredictError::InvalidOrderPrice.into());
    }
    if quantity == 0 {
        return Err(IpredictError::InvalidOrderQuantity.into());
    }
    
    // Check wager is open
    let clock = Clock::get()?;
    if !wager.is_open(&clock) {
        return Err(IpredictError::WagerNotOpen.into());
    }
    
    // For sell orders, transfer tokens to escrow
    if side == OrderSide::Sell {
        // Check user has sufficient balance
        if ctx.accounts.user_token_account.amount < quantity {
            return Err(IpredictError::InsufficientBalance.into());
        }
        
        // Transfer tokens to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, quantity)?;
    } else {
        // For buy orders, check user has sufficient SOL
        let required_sol = quantity
            .checked_mul(price)
            .ok_or(IpredictError::MathOverflow)?;
        
        let user_balance = ctx.accounts.user.lamports();
        if user_balance < required_sol {
            return Err(IpredictError::InsufficientBalance.into());
        }
    }
    
    // Create order
    let order = Order {
        id: order_book.next_order_id,
        owner: ctx.accounts.user.key(),
        side,
        token_type,
        price,
        quantity,
        filled_quantity: 0,
        timestamp: clock.unix_timestamp,
    };
    
    // Add to order book
    order_book.add_order(order)?;
    order_book.next_order_id = order_book.next_order_id
        .checked_add(1)
        .ok_or(IpredictError::MathOverflow)?;
    
    // Update user position tracking
    match (side, token_type) {
        (OrderSide::Buy, TokenType::Yes) => {
            user_position.yes_tokens_bought = user_position.yes_tokens_bought
                .checked_add(quantity)
                .ok_or(IpredictError::MathOverflow)?;
        }
        (OrderSide::Buy, TokenType::No) => {
            user_position.no_tokens_bought = user_position.no_tokens_bought
                .checked_add(quantity)
                .ok_or(IpredictError::MathOverflow)?;
        }
        (OrderSide::Sell, TokenType::Yes) => {
            user_position.yes_tokens_sold = user_position.yes_tokens_sold
                .checked_add(quantity)
                .ok_or(IpredictError::MathOverflow)?;
        }
        (OrderSide::Sell, TokenType::No) => {
            user_position.no_tokens_sold = user_position.no_tokens_sold
                .checked_add(quantity)
                .ok_or(IpredictError::MathOverflow)?;
        }
    }
    
    msg!(
        "Order placed: {} {} {} tokens at {} lamports each",
        match side { OrderSide::Buy => "BUY", OrderSide::Sell => "SELL" },
        quantity,
        match token_type { TokenType::Yes => "YES", TokenType::No => "NO" },
        price
    );
    
    Ok(())
}