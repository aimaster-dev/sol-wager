use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Platform, Wager, OrderBook, UserPosition, OrderSide, TokenType};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
#[instruction(token_type: TokenType)]
pub struct QuickBuy<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Box<Account<'info, Platform>>,
    
    #[account(
        mut,
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
        init_if_needed,
        payer = user,
        space = UserPosition::SIZE,
        seeds = [USER_POSITION_SEED, user.key().as_ref(), wager.key().as_ref()],
        bump
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
    
    #[account(mut)]
    /// CHECK: Platform fee recipient
    pub platform_fee_recipient: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Creator fee recipient
    pub creator_fee_recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


pub fn quick_buy(
    ctx: Context<QuickBuy>,
    token_type: TokenType,
    sol_amount: u64,
    min_tokens_out: u64,
) -> Result<()> {
    let wager = &ctx.accounts.wager;
    let order_book = &mut ctx.accounts.order_book;
    let platform = &mut ctx.accounts.platform;
    let user_position = &mut ctx.accounts.user_position;
    
    // Validate that the user token account mint matches the token type
    let expected_mint = match token_type {
        TokenType::Yes => wager.yes_mint,
        TokenType::No => wager.no_mint,
    };
    
    if ctx.accounts.user_token_account.mint != expected_mint {
        return Err(IpredictError::InvalidTokenMint.into());
    }
    
    // Check wager is open
    let clock = Clock::get()?;
    if !wager.is_open(&clock) {
        return Err(IpredictError::WagerNotOpen.into());
    }
    
    // Get sell orders for the requested token type
    let sell_orders = match token_type {
        TokenType::Yes => &mut order_book.sell_orders_yes,
        TokenType::No => &mut order_book.sell_orders_no,
    };
    
    // Sort by price ascending (best price first)
    sell_orders.sort_by(|a, b| a.price.cmp(&b.price));
    
    let mut remaining_sol = sol_amount;
    let mut tokens_bought = 0u64;
    let mut total_fees = 0u64;
    let mut filled_orders = Vec::new();
    
    // Execute market buy against sell orders
    for (i, order) in sell_orders.iter_mut().enumerate() {
        if remaining_sol == 0 {
            break;
        }
        
        let available_tokens = order.quantity.saturating_sub(order.filled_quantity);
        if available_tokens == 0 {
            continue;
        }
        
        // Calculate how many tokens we can buy with remaining SOL
        let max_tokens_affordable = remaining_sol
            .checked_div(order.price)
            .unwrap_or(0);
        
        let tokens_to_buy = available_tokens.min(max_tokens_affordable);
        
        if tokens_to_buy > 0 {
            let cost = tokens_to_buy
                .checked_mul(order.price)
                .ok_or(IpredictError::MathOverflow)?;
            
            // Calculate fees
            let fee = cost
                .checked_mul(TOTAL_FEE_BPS as u64)
                .ok_or(IpredictError::MathOverflow)?
                .checked_div(BPS_DIVISOR)
                .ok_or(IpredictError::MathOverflow)?;
            
            let platform_fee = fee
                .checked_mul(PLATFORM_FEE_BPS as u64)
                .ok_or(IpredictError::MathOverflow)?
                .checked_div(TOTAL_FEE_BPS as u64)
                .ok_or(IpredictError::MathOverflow)?;
            
            let creator_fee = fee.saturating_sub(platform_fee);
            let seller_receives = cost.saturating_sub(fee);
            
            // Transfer SOL to seller (simplified - in production would track seller accounts)
            **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.user
                .to_account_info()
                .lamports()
                .checked_sub(cost)
                .ok_or(IpredictError::InsufficientBalance)?;
            
            // Transfer fees
            **ctx.accounts.platform_fee_recipient.try_borrow_mut_lamports()? = ctx.accounts
                .platform_fee_recipient
                .lamports()
                .checked_add(platform_fee)
                .ok_or(IpredictError::MathOverflow)?;
            
            **ctx.accounts.creator_fee_recipient.try_borrow_mut_lamports()? = ctx.accounts
                .creator_fee_recipient
                .lamports()
                .checked_add(creator_fee)
                .ok_or(IpredictError::MathOverflow)?;
            
            // Update order
            order.filled_quantity = order.filled_quantity
                .checked_add(tokens_to_buy)
                .ok_or(IpredictError::MathOverflow)?;
            
            if order.filled_quantity >= order.quantity {
                filled_orders.push(i);
            }
            
            // Update counters
            tokens_bought = tokens_bought
                .checked_add(tokens_to_buy)
                .ok_or(IpredictError::MathOverflow)?;
            remaining_sol = remaining_sol
                .checked_sub(cost)
                .ok_or(IpredictError::MathOverflow)?;
            total_fees = total_fees
                .checked_add(fee)
                .ok_or(IpredictError::MathOverflow)?;
            
            msg!(
                "Quick buy: bought {} tokens at {} price from order {}",
                tokens_to_buy,
                order.price,
                order.id
            );
        }
    }
    
    // Transfer tokens from escrow to buyer
    if tokens_bought > 0 {
        let token_seed = token_type.to_seed();
        let wager_key = wager.key();
        let escrow_seeds = &[
            b"escrow",
            wager_key.as_ref(),
            token_seed.as_ref(),
            &[ctx.bumps.escrow_account],
        ];
        let escrow_signer = &[&escrow_seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.escrow_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, escrow_signer);
        token::transfer(cpi_ctx, tokens_bought)?;
    }
    
    // Remove filled orders (in reverse order to maintain indices)
    for i in filled_orders.iter().rev() {
        sell_orders.remove(*i);
    }
    
    // Check slippage
    if tokens_bought < min_tokens_out {
        return Err(IpredictError::SlippageExceeded.into());
    }
    
    // Update stats
    platform.total_volume_traded = platform.total_volume_traded
        .checked_add(sol_amount.saturating_sub(remaining_sol))
        .ok_or(IpredictError::MathOverflow)?;
    platform.total_fees_collected = platform.total_fees_collected
        .checked_add(total_fees)
        .ok_or(IpredictError::MathOverflow)?;
    
    wager.total_volume_traded = wager.total_volume_traded
        .checked_add(sol_amount.saturating_sub(remaining_sol))
        .ok_or(IpredictError::MathOverflow)?;
    wager.total_fees_collected = wager.total_fees_collected
        .checked_add(total_fees)
        .ok_or(IpredictError::MathOverflow)?;
    
    // Initialize user position if needed
    if user_position.user == Pubkey::default() {
        user_position.user = ctx.accounts.user.key();
        user_position.wager = wager.key();
        user_position.bump = ctx.bumps.user_position;
    }
    
    // Update user position
    match token_type {
        TokenType::Yes => {
            user_position.yes_tokens_bought = user_position.yes_tokens_bought
                .checked_add(tokens_bought)
                .ok_or(IpredictError::MathOverflow)?;
        }
        TokenType::No => {
            user_position.no_tokens_bought = user_position.no_tokens_bought
                .checked_add(tokens_bought)
                .ok_or(IpredictError::MathOverflow)?;
        }
    }
    
    msg!(
        "Quick buy complete: bought {} {} tokens for {} SOL (spent {}, {} refunded)",
        tokens_bought,
        match token_type { TokenType::Yes => "YES", TokenType::No => "NO" },
        sol_amount as f64 / LAMPORTS_PER_SOL as f64,
        (sol_amount - remaining_sol) as f64 / LAMPORTS_PER_SOL as f64,
        remaining_sol as f64 / LAMPORTS_PER_SOL as f64
    );
    
    Ok(())
}