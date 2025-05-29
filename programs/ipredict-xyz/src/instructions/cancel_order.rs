use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Wager, OrderBook, OrderSide, TokenType};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
pub struct CancelOrder<'info> {
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
        constraint = user_token_account.owner == user.key()
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: Escrow account - validated by seeds
    #[account(
        mut,
        seeds = [b"escrow", wager.key().as_ref(), b"yes"],
        bump
    )]
    pub yes_escrow: AccountInfo<'info>,
    
    /// CHECK: Escrow account - validated by seeds
    #[account(
        mut,
        seeds = [b"escrow", wager.key().as_ref(), b"no"],
        bump
    )]
    pub no_escrow: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
    let order_book = &mut ctx.accounts.order_book;
    let wager = &ctx.accounts.wager;
    
    // Find and remove order from all order lists
    let mut order = None;
    let mut order_side = OrderSide::Buy;
    let mut order_token_type = TokenType::Yes;
    
    // Search in all order lists
    for (side, token_type, orders) in [
        (OrderSide::Buy, TokenType::Yes, &mut order_book.buy_orders_yes),
        (OrderSide::Sell, TokenType::Yes, &mut order_book.sell_orders_yes),
        (OrderSide::Buy, TokenType::No, &mut order_book.buy_orders_no),
        (OrderSide::Sell, TokenType::No, &mut order_book.sell_orders_no),
    ] {
        if let Some(pos) = orders.iter().position(|o| o.id == order_id) {
            order = Some(orders.remove(pos));
            order_side = side;
            order_token_type = token_type;
            break;
        }
    }
    
    let order = order.ok_or(IpredictError::OrderNotFound)?;
    
    // Verify ownership
    if order.owner != ctx.accounts.user.key() {
        return Err(IpredictError::Unauthorized.into());
    }
    
    // Return tokens from escrow for sell orders
    if order_side == OrderSide::Sell {
        let remaining = order.quantity.saturating_sub(order.filled_quantity);
        if remaining > 0 {
            // Determine which escrow to use
            let escrow_account = match order_token_type {
                TokenType::Yes => &ctx.accounts.yes_escrow,
                TokenType::No => &ctx.accounts.no_escrow,
            };
            
            // Create escrow signer seeds
            let token_seed = order_token_type.to_seed();
            
            let escrow_bump = match order_token_type {
                TokenType::Yes => ctx.bumps.yes_escrow,
                TokenType::No => ctx.bumps.no_escrow,
            };
            
            let wager_key = wager.key();
            let escrow_seeds = &[
                b"escrow",
                wager_key.as_ref(),
                token_seed.as_ref(),
                &[escrow_bump],
            ];
            let escrow_signer = &[&escrow_seeds[..]];
            
            // Transfer tokens back to user
            let cpi_accounts = Transfer {
                from: escrow_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: escrow_account.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, escrow_signer);
            token::transfer(cpi_ctx, remaining)?;
            
            msg!(
                "Cancelled sell order {}, returned {} {} tokens from escrow",
                order_id,
                remaining,
                match order_token_type { TokenType::Yes => "YES", TokenType::No => "NO" }
            );
        }
    } else {
        msg!("Cancelled buy order {}", order_id);
    }
    
    Ok(())
}