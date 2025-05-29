use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Platform, Wager, OrderBook, OrderSide, TokenType};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
pub struct MatchOrders<'info> {
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
        mut,
        seeds = [b"escrow", wager.key().as_ref(), b"yes"],
        bump
    )]
    pub yes_escrow: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        seeds = [b"escrow", wager.key().as_ref(), b"no"],
        bump
    )]
    pub no_escrow: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    /// CHECK: Platform fee recipient
    pub platform_fee_recipient: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Creator fee recipient
    pub creator_fee_recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn match_orders(
    ctx: Context<MatchOrders>,
    max_iterations: u8,
) -> Result<()> {
    let wager = &ctx.accounts.wager;
    let order_book = &mut ctx.accounts.order_book;
    let platform = &mut ctx.accounts.platform;
    
    let mut iterations = 0u8;
    let mut total_volume = 0u64;
    let mut total_fees = 0u64;
    
    // Match YES orders
    {
        let mut buy_idx = 0;
        let mut sell_idx = 0;
        let mut completed_orders = Vec::new();
        
        while buy_idx < order_book.buy_orders_yes.len() && 
              sell_idx < order_book.sell_orders_yes.len() && 
              iterations < max_iterations {
            
            // Get order details without holding mutable references
            let (buy_price, buy_quantity, buy_filled, buy_owner, buy_id) = {
                let buy_order = &order_book.buy_orders_yes[buy_idx];
                (buy_order.price, buy_order.quantity, buy_order.filled_quantity, buy_order.owner, buy_order.id)
            };
            
            let (sell_price, sell_quantity, sell_filled, sell_owner, sell_id) = {
                let sell_order = &order_book.sell_orders_yes[sell_idx];
                (sell_order.price, sell_order.quantity, sell_order.filled_quantity, sell_order.owner, sell_order.id)
            };
            
            // Check if orders can match (buy price >= sell price)
            if buy_price >= sell_price {
                // Calculate match quantity
                let buy_remaining = buy_quantity.saturating_sub(buy_filled);
                let sell_remaining = sell_quantity.saturating_sub(sell_filled);
                let match_quantity = buy_remaining.min(sell_remaining);
                
                if match_quantity > 0 {
                    // Calculate trade amount and fees
                    let execution_price = buy_price
                        .checked_add(sell_price)
                        .ok_or(IpredictError::MathOverflow)?
                        .checked_div(2)
                        .ok_or(IpredictError::MathOverflow)?;
                    
                    let trade_amount = match_quantity
                        .checked_mul(execution_price)
                        .ok_or(IpredictError::MathOverflow)?;
                    
                    let fee = trade_amount
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
                    
                    // Update order filled quantities
                    {
                        let buy_order = &mut order_book.buy_orders_yes[buy_idx];
                        buy_order.filled_quantity = buy_order.filled_quantity
                            .checked_add(match_quantity)
                            .ok_or(IpredictError::MathOverflow)?;
                        
                        if buy_order.filled_quantity >= buy_order.quantity {
                            completed_orders.push(("buy_yes".to_string(), buy_idx));
                        }
                    }
                    
                    {
                        let sell_order = &mut order_book.sell_orders_yes[sell_idx];
                        sell_order.filled_quantity = sell_order.filled_quantity
                            .checked_add(match_quantity)
                            .ok_or(IpredictError::MathOverflow)?;
                        
                        if sell_order.filled_quantity >= sell_order.quantity {
                            completed_orders.push(("sell_yes".to_string(), sell_idx));
                        }
                    }
                    
                    // Transfer tokens from escrow to buyer
                    let wager_key = wager.key();
                    let escrow_seeds = &[
                        b"escrow",
                        wager_key.as_ref(),
                        b"yes",
                        &[ctx.bumps.yes_escrow],
                    ];
                    let escrow_signer = &[&escrow_seeds[..]];
                    
                    // In production: transfer to buyer's account
                    // For now, tokens stay in escrow and we track ownership separately
                    
                    total_volume = total_volume
                        .checked_add(trade_amount)
                        .ok_or(IpredictError::MathOverflow)?;
                    total_fees = total_fees
                        .checked_add(fee)
                        .ok_or(IpredictError::MathOverflow)?;
                    
                    msg!(
                        "Matched YES orders: {} tokens at {} price, fee: {}",
                        match_quantity,
                        execution_price,
                        fee
                    );
                    
                    iterations += 1;
                }
            }
            
            // Move to next order
            if buy_idx < order_book.buy_orders_yes.len() && 
               sell_idx < order_book.sell_orders_yes.len() {
                let buy_order = &order_book.buy_orders_yes[buy_idx];
                let sell_order = &order_book.sell_orders_yes[sell_idx];
                
                if buy_order.filled_quantity >= buy_order.quantity {
                    buy_idx += 1;
                } else if sell_order.filled_quantity >= sell_order.quantity {
                    sell_idx += 1;
                } else {
                    break; // No more matches possible
                }
            }
        }
        
        // Remove completed orders in reverse order
        completed_orders.sort_by(|a, b| b.1.cmp(&a.1));
        for (order_type, idx) in completed_orders {
            match order_type.as_str() {
                "buy_yes" => { order_book.buy_orders_yes.remove(idx); }
                "sell_yes" => { order_book.sell_orders_yes.remove(idx); }
                _ => {}
            }
        }
    }
    
    // Match NO orders (similar logic)
    {
        let mut buy_idx = 0;
        let mut sell_idx = 0;
        let mut completed_orders = Vec::new();
        
        while buy_idx < order_book.buy_orders_no.len() && 
              sell_idx < order_book.sell_orders_no.len() && 
              iterations < max_iterations {
            
            // Get order details without holding mutable references
            let (buy_price, buy_quantity, buy_filled, buy_owner, buy_id) = {
                let buy_order = &order_book.buy_orders_no[buy_idx];
                (buy_order.price, buy_order.quantity, buy_order.filled_quantity, buy_order.owner, buy_order.id)
            };
            
            let (sell_price, sell_quantity, sell_filled, sell_owner, sell_id) = {
                let sell_order = &order_book.sell_orders_no[sell_idx];
                (sell_order.price, sell_order.quantity, sell_order.filled_quantity, sell_order.owner, sell_order.id)
            };
            
            // Check if orders can match (buy price >= sell price)
            if buy_price >= sell_price {
                // Calculate match quantity
                let buy_remaining = buy_quantity.saturating_sub(buy_filled);
                let sell_remaining = sell_quantity.saturating_sub(sell_filled);
                let match_quantity = buy_remaining.min(sell_remaining);
                
                if match_quantity > 0 {
                    // Calculate trade amount and fees
                    let execution_price = buy_price
                        .checked_add(sell_price)
                        .ok_or(IpredictError::MathOverflow)?
                        .checked_div(2)
                        .ok_or(IpredictError::MathOverflow)?;
                    
                    let trade_amount = match_quantity
                        .checked_mul(execution_price)
                        .ok_or(IpredictError::MathOverflow)?;
                    
                    let fee = trade_amount
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
                    
                    // Update order filled quantities
                    {
                        let buy_order = &mut order_book.buy_orders_no[buy_idx];
                        buy_order.filled_quantity = buy_order.filled_quantity
                            .checked_add(match_quantity)
                            .ok_or(IpredictError::MathOverflow)?;
                        
                        if buy_order.filled_quantity >= buy_order.quantity {
                            completed_orders.push(("buy_no".to_string(), buy_idx));
                        }
                    }
                    
                    {
                        let sell_order = &mut order_book.sell_orders_no[sell_idx];
                        sell_order.filled_quantity = sell_order.filled_quantity
                            .checked_add(match_quantity)
                            .ok_or(IpredictError::MathOverflow)?;
                        
                        if sell_order.filled_quantity >= sell_order.quantity {
                            completed_orders.push(("sell_no".to_string(), sell_idx));
                        }
                    }
                    
                    // Transfer tokens from escrow to buyer
                    let wager_key = wager.key();
                    let escrow_seeds = &[
                        b"escrow",
                        wager_key.as_ref(),
                        b"no",
                        &[ctx.bumps.no_escrow],
                    ];
                    let escrow_signer = &[&escrow_seeds[..]];
                    
                    // In production: transfer to buyer's account
                    // For now, tokens stay in escrow and we track ownership separately
                    
                    total_volume = total_volume
                        .checked_add(trade_amount)
                        .ok_or(IpredictError::MathOverflow)?;
                    total_fees = total_fees
                        .checked_add(fee)
                        .ok_or(IpredictError::MathOverflow)?;
                    
                    msg!(
                        "Matched NO orders: {} tokens at {} price, fee: {}",
                        match_quantity,
                        execution_price,
                        fee
                    );
                    
                    iterations += 1;
                }
            }
            
            // Move to next order
            if buy_idx < order_book.buy_orders_no.len() && 
               sell_idx < order_book.sell_orders_no.len() {
                let buy_order = &order_book.buy_orders_no[buy_idx];
                let sell_order = &order_book.sell_orders_no[sell_idx];
                
                if buy_order.filled_quantity >= buy_order.quantity {
                    buy_idx += 1;
                } else if sell_order.filled_quantity >= sell_order.quantity {
                    sell_idx += 1;
                } else {
                    break; // No more matches possible
                }
            }
        }
        
        // Remove completed orders in reverse order
        completed_orders.sort_by(|a, b| b.1.cmp(&a.1));
        for (order_type, idx) in completed_orders {
            match order_type.as_str() {
                "buy_no" => { order_book.buy_orders_no.remove(idx); }
                "sell_no" => { order_book.sell_orders_no.remove(idx); }
                _ => {}
            }
        }
    }
    
    // Update stats
    platform.total_volume_traded = platform.total_volume_traded
        .checked_add(total_volume)
        .ok_or(IpredictError::MathOverflow)?;
    platform.total_fees_collected = platform.total_fees_collected
        .checked_add(total_fees)
        .ok_or(IpredictError::MathOverflow)?;
    
    wager.total_volume_traded = wager.total_volume_traded
        .checked_add(total_volume)
        .ok_or(IpredictError::MathOverflow)?;
    wager.total_fees_collected = wager.total_fees_collected
        .checked_add(total_fees)
        .ok_or(IpredictError::MathOverflow)?;
    
    msg!(
        "Order matching complete: {} iterations, {} volume, {} fees",
        iterations,
        total_volume,
        total_fees
    );
    
    Ok(())
}