// programs/general-wager-bet/src/order_matching.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{Order, OrderStatus, Platform, WagerError};

pub fn match_orders(ctx: Context<super::CreateOrder>) -> Result<bool> {
    let order = &mut ctx.accounts.order;
    let order_book = &mut ctx.accounts.order_book;
    let wager = &ctx.accounts.wager;
    
    // Determine what type of orders to match against
    let is_buy = order.is_buy;
    let is_yes_token = order.is_yes_token;
    
    // Get all matching orders (opposite side, same token type)
    let matching_orders = get_matching_orders(
        ctx.program_id,
        order_book.key(),
        !is_buy,  // Opposite side
        is_yes_token,
        order.price,
        is_buy,
    )?;
    
    // Track if any matching occurred
    let mut matched = false;
    
    // Process each matching order
    for matching_order_info in matching_orders {
        // Skip orders that are not active
        let matching_order = Account::<Order>::try_from(&matching_order_info)?;
        if matching_order.status != OrderStatus::Active && 
           matching_order.status != OrderStatus::PartiallyFilled {
            continue;
        }
        
        // Skip orders with incompatible prices
        // For a buy order, we only match if the selling price is <= our buy price
        // For a sell order, we only match if the buying price is >= our sell price
        if (is_buy && matching_order.price > order.price) ||
           (!is_buy && matching_order.price < order.price) {
            continue;
        }
        
        // Calculate the match amount (min of both remaining quantities)
        let match_amount = std::cmp::min(
            matching_order.remaining_quantity,
            order.remaining_quantity
        );
        
        if match_amount == 0 {
            continue;
        }
        
        // We have a match!
        matched = true;
        
        // Calculate the execution price (typically the maker's price)
        let execution_price = matching_order.price;
        
        // Calculate the total cost of this match in lamports
        let match_cost = execution_price
            .checked_mul(match_amount)
            .unwrap()
            .checked_div(1_000_000_000)
            .unwrap();
        
        // Calculate platform fee
        let platform = get_platform_account(ctx.program_id)?;
        let fee_bps = platform.trading_fee_bps as u64;
        let fee_amount = match_cost
            .checked_mul(fee_bps)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        
        // Execute the match differently based on order types
        if is_buy {
            // We're buying tokens, matching order is selling
            
            // 1. Transfer SOL from our order account to seller (minus fee)
            transfer_sol(
                &matching_order_info,
                &ctx.accounts.order.to_account_info(),
                &matching_order.owner,
                match_cost.checked_sub(fee_amount).unwrap()
            )?;
            
            // 2. Transfer SOL fee to platform
            transfer_sol(
                &matching_order_info,
                &ctx.accounts.order.to_account_info(),
                &platform.key(),
                fee_amount
            )?;
            
            // 3. Transfer tokens from vault to buyer
            let vault_account = if is_yes_token {
                &ctx.accounts.yes_vault
            } else {
                &ctx.accounts.no_vault
            };
            
            let token_account = if is_yes_token {
                &ctx.accounts.user_yes_token
            } else {
                &ctx.accounts.user_no_token
            };
            
            // Transfer tokens from vault to buyer
            let seeds = &[
                b"wager".as_ref(),
                wager.key().as_ref(),
                &[*ctx.bumps.get("wager").unwrap()],
            ];
            let signer = &[&seeds[..]];
            
            let cpi_accounts = Transfer {
                from: vault_account.to_account_info(),
                to: token_account.to_account_info(),
                authority: ctx.accounts.wager.to_account_info(),
            };
            
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, match_amount)?;
            
        } else {
            // We're selling tokens, matching order is buying
            
            // 1. Transfer SOL from matching order to seller (minus fee)
            transfer_sol(
                &matching_order_info,
                &matching_order_info,
                &ctx.accounts.user.key(),
                match_cost.checked_sub(fee_amount).unwrap()
            )?;
            
            // 2. Transfer SOL fee to platform
            transfer_sol(
                &matching_order_info,
                &matching_order_info,
                &platform.key(),
                fee_amount
            )?;
            
            // 3. Transfer tokens from vault to buyer
            let vault_account = if is_yes_token {
                &ctx.accounts.yes_vault
            } else {
                &ctx.accounts.no_vault
            };
            
            let token_account = get_user_token_account(
                &matching_order.owner,
                if is_yes_token {
                    &wager.yes_mint
                } else {
                    &wager.no_mint
                }
            )?;
            
            // Transfer tokens from vault to buyer
            let seeds = &[
                b"wager".as_ref(),
                wager.key().as_ref(),
                &[*ctx.bumps.get("wager").unwrap()],
            ];
            let signer = &[&seeds[..]];
            
            let cpi_accounts = Transfer {
                from: vault_account.to_account_info(),
                to: token_account,
                authority: ctx.accounts.wager.to_account_info(),
            };
            
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, match_amount)?;
        }
        
        // Update both orders
        // 1. Update matching order
        let mut matching_order_mut = matching_order.to_account_info();
        let mut matching_order_data = matching_order_mut.try_borrow_mut_data()?;
        let mut matching_order_account = Account::<Order>::try_deserialize(&mut &matching_order_data[..])?;
        
        matching_order_account.remaining_quantity = matching_order_account.remaining_quantity.checked_sub(match_amount).unwrap();
        if matching_order_account.remaining_quantity == 0 {
            matching_order_account.status = OrderStatus::Filled;
            // Decrease active orders count
            order_book.active_orders_count = order_book.active_orders_count.saturating_sub(1);
        } else {
            matching_order_account.status = OrderStatus::PartiallyFilled;
        }
        
        // Serialize the updated account back
        matching_order_account.try_serialize(&mut *matching_order_data)?;
        
        // 2. Update our order
        order.remaining_quantity = order.remaining_quantity.checked_sub(match_amount).unwrap();
        if order.remaining_quantity == 0 {
            order.status = OrderStatus::Filled;
            // Don't increase active orders count here, it was already increased when creating the order
            break;
        } else {
            order.status = OrderStatus::PartiallyFilled;
        }
    }
    
    // If no matching occurred, the order stays in the orderbook
    // If partial matching occurred, the remaining amount stays in the orderbook
    // If completely filled, the order is no longer in the active orderbook
    
    if order.remaining_quantity == 0 {
        msg!("Order fully filled");
    } else if matched {
        msg!("Order partially filled, remaining in orderbook");
    } else {
        msg!("No matches found, order added to orderbook");
    }
    
    Ok(matched)
}

// Helper function to get matching orders
fn get_matching_orders(
    program_id: &Pubkey,
    order_book: &Pubkey,
    is_sell: bool,
    is_yes_token: bool,
    price: u64,
    is_price_ascending: bool,
) -> Result<Vec<AccountInfo>> {
    // In a real implementation, you would query all orders that match the criteria
    // For placeholder purposes, returning an empty vector
    Ok(Vec::new())
}

// Helper function to transfer SOL between accounts
fn transfer_sol(
    program_account: &AccountInfo,
    from_account: &AccountInfo,
    to_pubkey: &Pubkey,
    amount: u64,
) -> Result<()> {
    // Create the transfer instruction
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &from_account.key(),
        to_pubkey,
        amount,
    );
    
    // Invoke the instruction
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            from_account.clone(),
            program_account.clone(),
        ],
    )?;
    
    Ok(())
}

// Helper function to get the platform account
fn get_platform_account(program_id: &Pubkey) -> Result<Account<Platform>> {
    // In a real implementation, you would look up the platform account
    // Placeholder implementation that will need to be replaced
    Err(ProgramError::InvalidAccountData.into())
}

// Helper function to get a user's token account
fn get_user_token_account(user: &Pubkey, mint: &Pubkey) -> Result<AccountInfo> {
    // In a real implementation, you would look up or create the associated token account
    // Placeholder implementation that will need to be replaced
    Err(ProgramError::InvalidAccountData.into())
}