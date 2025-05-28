// src/lib.rs
// Complete implementation with order matching module

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer, Burn};
use anchor_spl::associated_token::AssociatedToken;
use std::convert::TryFrom;

// Add order matching module
mod order_matching;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod general_wager_bet {
    use super::*;

    // Initialize the betting platform
    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.deployment_fee = 1_000_000_000; // 1 SOL in lamports
        platform.trading_fee_bps = 50; // 0.5% trading fee (50 basis points)
        platform.wager_count = 0;
        
        msg!("Platform initialized successfully");
        Ok(())
    }

    // Create a new wager/proposition
    pub fn create_wager(
        ctx: Context<CreateWager>,
        name: String,
        description: String,
        opening_time: i64,
        conclusion_time: i64,
        conclusion_details: String,
    ) -> Result<()> {
        // Verify timestamp constraints
        let clock = Clock::get()?;
        require!(
            opening_time > clock.unix_timestamp,
            WagerError::InvalidOpeningTime
        );
        require!(
            conclusion_time > opening_time,
            WagerError::InvalidConclusionTime
        );
        require!(name.len() <= 50, WagerError::NameTooLong);
        require!(
            description.len() <= 500,
            WagerError::DescriptionTooLong
        );
        require!(
            conclusion_details.len() <= 500,
            WagerError::ConclusionDetailsTooLong
        );

        // Transfer deployment fee
        let platform = &ctx.accounts.platform;
        let deployment_fee = platform.deployment_fee;
        
        // Transfer SOL from the wager creator to the platform
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.wager_creator.key(),
            &ctx.accounts.platform_vault.key(),
            deployment_fee,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.wager_creator.to_account_info(),
                ctx.accounts.platform_vault.to_account_info(),
            ],
        )?;

        // Initialize wager account data
        let wager = &mut ctx.accounts.wager;
        wager.authority = ctx.accounts.wager_creator.key();
        wager.platform = ctx.accounts.platform.key();
        wager.name = name;
        wager.description = description;
        wager.opening_time = opening_time;
        wager.conclusion_time = conclusion_time;
        wager.conclusion_details = conclusion_details;
        wager.yes_mint = ctx.accounts.yes_mint.key();
        wager.no_mint = ctx.accounts.no_mint.key();
        wager.yes_vault = ctx.accounts.yes_vault.key();
        wager.no_vault = ctx.accounts.no_vault.key();
        wager.sol_vault = ctx.accounts.sol_vault.key();
        wager.status = WagerStatus::Created;
        wager.resolution = WagerResolution::Pending;
        wager.index = ctx.accounts.platform.wager_count;
        
        // Update wager counter in platform
        let platform = &mut ctx.accounts.platform;
        platform.wager_count += 1;
        
        // Initialize the order book for this wager
        let order_book = &mut ctx.accounts.order_book;
        order_book.wager = wager.key();
        order_book.next_order_id = 1;
        order_book.active_orders_count = 0;

        // Set up initial liquidity provided by deployer
        // Mint 100 YES and 100 NO tokens to the deployer
        let seeds = &[
            b"wager".as_ref(),
            wager.key().as_ref(),
            &[*ctx.bumps.get("wager").unwrap()],
        ];
        let signer = &[&seeds[..]];

        // Mint 100 YES tokens to deployer
        let cpi_accounts = MintTo {
            mint: ctx.accounts.yes_mint.to_account_info(),
            to: ctx.accounts.deployer_yes_token.to_account_info(),
            authority: ctx.accounts.wager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, 100_000_000_000)?; // 100 tokens with 9 decimals

        // Mint 100 NO tokens to deployer
        let cpi_accounts = MintTo {
            mint: ctx.accounts.no_mint.to_account_info(),
            to: ctx.accounts.deployer_no_token.to_account_info(),
            authority: ctx.accounts.wager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, 100_000_000_000)?; // 100 tokens with 9 decimals

        msg!("Created wager {}", name);
        Ok(())
    }

    // Deposit SOL to mint YES and NO tokens
    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        // Check if wager is in valid state for deposits
        let wager = &ctx.accounts.wager;
        require!(
            wager.status == WagerStatus::Created || wager.status == WagerStatus::Active,
            WagerError::InvalidWagerStatus
        );
        
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < wager.conclusion_time,
            WagerError::WagerConcluded
        );

        // Transfer SOL from user to wager vault
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.sol_vault.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
            ],
        )?;

        // Calculate token amount to mint (100 tokens per SOL)
        let token_amount = amount.checked_mul(100).unwrap().checked_div(1_000_000_000).unwrap().checked_mul(1_000_000_000).unwrap();
        
        // Mint YES tokens to user
        let seeds = &[
            b"wager".as_ref(),
            wager.key().as_ref(),
            &[*ctx.bumps.get("wager").unwrap()],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.yes_mint.to_account_info(),
            to: ctx.accounts.user_yes_token.to_account_info(),
            authority: ctx.accounts.wager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, token_amount)?;

        // Mint NO tokens to user
        let cpi_accounts = MintTo {
            mint: ctx.accounts.no_mint.to_account_info(),
            to: ctx.accounts.user_no_token.to_account_info(),
            authority: ctx.accounts.wager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, token_amount)?;

        // Update status to Active if it's the first deposit
        if wager.status == WagerStatus::Created {
            let wager = &mut ctx.accounts.wager;
            wager.status = WagerStatus::Active;
        }

        msg!("Deposited {} lamports and minted {} YES/NO tokens", amount, token_amount);
        Ok(())
    }

    // Create a new order
    pub fn create_order(
        ctx: Context<CreateOrder>,
        is_buy: bool,
        is_yes_token: bool,
        price: u64,
        quantity: u64,
    ) -> Result<()> {
        // Validate wager is active
        let wager = &ctx.accounts.wager;
        require!(
            wager.status == WagerStatus::Active,
            WagerError::WagerNotActive
        );
        
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= wager.opening_time && 
            clock.unix_timestamp < wager.conclusion_time,
            WagerError::OutsideTradingWindow
        );
        
        // Validate price (must be between 0 and 1 SOL)
        require!(price > 0 && price <= 1_000_000_000, WagerError::InvalidPrice);
        
        // Create new order
        let order_book = &mut ctx.accounts.order_book;
        let order_id = order_book.next_order_id;
        order_book.next_order_id += 1;
        order_book.active_orders_count += 1;
        
        let order = &mut ctx.accounts.order;
        order.id = order_id;
        order.owner = ctx.accounts.user.key();
        order.wager = ctx.accounts.wager.key();
        order.is_buy = is_buy;
        order.is_yes_token = is_yes_token;
        order.price = price;
        order.original_quantity = quantity;
        order.remaining_quantity = quantity;
        order.status = OrderStatus::Active;
        order.created_at = clock.unix_timestamp;
        
        // Transfer tokens to program vault
        if is_buy {
            // Calculate total SOL needed for the order
            let total_cost = price.checked_mul(quantity).unwrap().checked_div(1_000_000_000).unwrap();
            
            // Transfer SOL from user to order account
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.user.key(),
                &ctx.accounts.order.key(),
                total_cost,
            );
            
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.order.to_account_info(),
                ],
            )?;
        } else {
            // Transfer tokens from user to vault
            let source_token_account = if is_yes_token {
                &ctx.accounts.user_yes_token
            } else {
                &ctx.accounts.user_no_token
            };
            
            let cpi_accounts = Transfer {
                from: source_token_account.to_account_info(),
                to: if is_yes_token {
                    ctx.accounts.yes_vault.to_account_info()
                } else {
                    ctx.accounts.no_vault.to_account_info()
                },
                authority: ctx.accounts.user.to_account_info(),
            };
            
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, quantity)?;
        }
        
        // Try to match with existing orders
        let matched = Self::match_orders(ctx)?;
        
        // If the order was not fully filled, it stays in the orderbook
        // If the order was fully filled, we need to decrease the active orders count
        if order.remaining_quantity == 0 {
            order_book.active_orders_count = order_book.active_orders_count.saturating_sub(1);
        }
        
        Ok(())
    }
    
    // Match orders with the order matching module
    fn match_orders(ctx: Context<CreateOrder>) -> Result<bool> {
        // Use the implementation from the order_matching module
        order_matching::match_orders(ctx)
    }

    // Cancel an order
    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        let order = &mut ctx.accounts.order;
        
        // Verify order is active and belongs to the user
        require!(
            order.status == OrderStatus::Active || order.status == OrderStatus::PartiallyFilled,
            WagerError::OrderNotActive
        );
        require!(
            order.owner == ctx.accounts.user.key(),
            WagerError::NotOrderOwner
        );
        require!(
            order.remaining_quantity > 0,
            WagerError::OrderFullyFilled
        );
        
        // Update order status
        if order.remaining_quantity == order.original_quantity {
            order.status = OrderStatus::Cancelled;
        } else {
            order.status = OrderStatus::PartiallyCancelled;
        }
        
        // Decrement active orders count
        let order_book = &mut ctx.accounts.order_book;
        order_book.active_orders_count = order_book.active_orders_count.saturating_sub(1);
        
        // Return funds to user
        if order.is_buy {
            // Calculate remaining SOL to return
            let refund_amount = order.price.checked_mul(order.remaining_quantity).unwrap().checked_div(1_000_000_000).unwrap();
            
            // Transfer SOL from order account to user
            **ctx.accounts.order.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
            **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += refund_amount;
        } else {
            // Transfer tokens from vault back to user
            let seeds = &[
                b"wager".as_ref(),
                ctx.accounts.wager.key().as_ref(),
                &[*ctx.bumps.get("wager").unwrap()],
            ];
            let signer = &[&seeds[..]];
            
            let token_account = if order.is_yes_token {
                &ctx.accounts.yes_vault
            } else {
                &ctx.accounts.no_vault
            };
            
            let cpi_accounts = Transfer {
                from: token_account.to_account_info(),
                to: if order.is_yes_token {
                    ctx.accounts.user_yes_token.to_account_info()
                } else {
                    ctx.accounts.user_no_token.to_account_info()
                },
                authority: ctx.accounts.wager.to_account_info(),
            };
            
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, order.remaining_quantity)?;
        }
        
        // Reset remaining quantity
        order.remaining_quantity = 0;
        
        msg!("Order cancelled successfully");
        Ok(())
    }

    // Resolve a wager (platform authority only)
    pub fn resolve_wager(
        ctx: Context<ResolveWager>,
        resolution: u8,
    ) -> Result<()> {
        // Verify wager is ready for resolution
        let wager = &ctx.accounts.wager;
        require!(
            wager.status == WagerStatus::Active,
            WagerError::WagerNotActive
        );
        
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= wager.conclusion_time,
            WagerError::WagerNotConcluded
        );
        
        // Verify caller is platform authority
        let platform = &ctx.accounts.platform;
        require!(
            platform.authority == ctx.accounts.authority.key(),
            WagerError::NotPlatformAuthority
        );
        
        // Update wager with resolution
        let wager = &mut ctx.accounts.wager;
        match resolution {
            0 => wager.resolution = WagerResolution::YesWon,
            1 => wager.resolution = WagerResolution::NoWon,
            2 => wager.resolution = WagerResolution::Draw,
            _ => return Err(WagerError::InvalidResolution.into()),
        }
        
        wager.status = WagerStatus::Resolved;
        
        msg!("Wager resolved: {:?}", wager.resolution);
        Ok(())
    }

    // Claim winnings from a resolved wager
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        // Check wager is resolved
        let wager = &ctx.accounts.wager;
        require!(
            wager.status == WagerStatus::Resolved,
            WagerError::WagerNotResolved
        );
        
        // Calculate winnings based on resolution and token holdings
        match wager.resolution {
            WagerResolution::YesWon => {
                // User can claim for YES tokens
                let amount = ctx.accounts.user_yes_token.amount;
                
                // 1 token = 0.01 SOL
                let payout = amount.checked_mul(10_000_000).unwrap(); // 0.01 SOL per token
                
                // Ensure vault has enough SOL
                let sol_vault = &ctx.accounts.sol_vault;
                require!(
                    sol_vault.lamports() >= payout,
                    WagerError::InsufficientFunds
                );
                
                // Transfer SOL from vault to user
                let seeds = &[
                    b"sol_vault".as_ref(),
                    wager.key().as_ref(),
                    &[*ctx.bumps.get("sol_vault").unwrap()],
                ];
                let signer = &[&seeds[..]];
                
                **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= payout;
                **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
                
                // Burn the YES tokens
                let seeds = &[
                    b"wager".as_ref(),
                    wager.key().as_ref(),
                    &[*ctx.bumps.get("wager").unwrap()],
                ];
                let signer = &[&seeds[..]];
                
                let cpi_accounts = Burn {
                    mint: ctx.accounts.yes_mint.to_account_info(),
                    from: ctx.accounts.user_yes_token.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, amount)?;
                
                msg!("Claimed {} SOL for YES tokens", payout as f64 / 1_000_000_000.0);
            },
            WagerResolution::NoWon => {
                // User can claim for NO tokens
                let amount = ctx.accounts.user_no_token.amount;
                
                // 1 token = 0.01 SOL
                let payout = amount.checked_mul(10_000_000).unwrap(); // 0.01 SOL per token
                
                // Ensure vault has enough SOL
                let sol_vault = &ctx.accounts.sol_vault;
                require!(
                    sol_vault.lamports() >= payout,
                    WagerError::InsufficientFunds
                );
                
                // Transfer SOL from vault to user
                let seeds = &[
                    b"sol_vault".as_ref(),
                    wager.key().as_ref(),
                    &[*ctx.bumps.get("sol_vault").unwrap()],
                ];
                let signer = &[&seeds[..]];
                
                **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= payout;
                **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
                
                // Burn the NO tokens
                let seeds = &[
                    b"wager".as_ref(),
                    wager.key().as_ref(),
                    &[*ctx.bumps.get("wager").unwrap()],
                ];
                let signer = &[&seeds[..]];
                
                let cpi_accounts = Burn {
                    mint: ctx.accounts.no_mint.to_account_info(),
                    from: ctx.accounts.user_no_token.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, amount)?;
                
                msg!("Claimed {} SOL for NO tokens", payout as f64 / 1_000_000_000.0);
            },
            WagerResolution::Draw => {
                // Return original SOL deposit (proportional to total YES+NO tokens)
                let yes_amount = ctx.accounts.user_yes_token.amount;
                let no_amount = ctx.accounts.user_no_token.amount;
                
                // Ensure the user has equal YES and NO tokens (should be the case if they got them through deposit)
                let refund_amount = (yes_amount.checked_add(no_amount).unwrap())
                    .checked_mul(5_000_000).unwrap(); // 0.005 SOL per token (0.01/2)
                
                // Ensure vault has enough SOL
                let sol_vault = &ctx.accounts.sol_vault;
                require!(
                    sol_vault.lamports() >= refund_amount,
                    WagerError::InsufficientFunds
                );
                
                // Transfer SOL from vault to user
                let seeds = &[
                    b"sol_vault".as_ref(),
                    wager.key().as_ref(),
                    &[*ctx.bumps.get("sol_vault").unwrap()],
                ];
                let signer = &[&seeds[..]];
                
                **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
                **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += refund_amount;
                
                // Burn both YES and NO tokens
                let seeds = &[
                    b"wager".as_ref(),
                    wager.key().as_ref(),
                    &[*ctx.bumps.get("wager").unwrap()],
                ];
                let signer = &[&seeds[..]];
                
                // Burn YES tokens
                let cpi_accounts = Burn {
                    mint: ctx.accounts.yes_mint.to_account_info(),
                    from: ctx.accounts.user_yes_token.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, yes_amount)?;
                
                // Burn NO tokens
                let cpi_accounts = Burn {
                    mint: ctx.accounts.no_mint.to_account_info(),
                    from: ctx.accounts.user_no_token.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, no_amount)?;
                
                msg!("Returned {} SOL for Draw resolution", refund_amount as f64 / 1_000_000_000.0);
            },
            WagerResolution::Pending => {
                return Err(WagerError::WagerNotResolved.into());
            }
        }
        
        Ok(())
    }

    // Automatic order placement - deposits SOL, gets tokens, places order for desired token, sells unwanted token
    pub fn buy_position(
        ctx: Context<BuyPosition>,
        is_yes_token: bool,
        sol_amount: u64,
    ) -> Result<()> {
        let wager = &ctx.accounts.wager;
        let order_book = &mut ctx.accounts.order_book;
        let platform = &ctx.accounts.platform;
        
        // Check if wager is active
        require!(
            wager.status == WagerStatus::Active,
            WagerError::WagerNotActive
        );
        
        // Calculate tokens to mint (100 tokens per SOL)
        let tokens_to_mint = sol_amount.checked_mul(100).unwrap();
        
        // Transfer SOL from user to SOL vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.sol_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, sol_amount)?;
        
        // Mint YES and NO tokens to user
        let seeds = &[
            b"wager".as_ref(),
            wager.key().as_ref(),
            &[*ctx.bumps.get("wager").unwrap()],
        ];
        let signer = &[&seeds[..]];
        
        // Mint YES tokens
        let cpi_accounts = MintTo {
            mint: ctx.accounts.yes_mint.to_account_info(),
            to: ctx.accounts.user_yes_token.to_account_info(),
            authority: ctx.accounts.wager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, tokens_to_mint)?;
        
        // Mint NO tokens
        let cpi_accounts = MintTo {
            mint: ctx.accounts.no_mint.to_account_info(),
            to: ctx.accounts.user_no_token.to_account_info(),
            authority: ctx.accounts.wager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, tokens_to_mint)?;
        
        // Now we need to check the order book for the best available price
        // and create a market sell order for the unwanted tokens
        
        // Get the best available price for the token we DON'T want
        let best_buy_price = get_best_buy_price(&ctx.accounts.order_book, !is_yes_token)?;
        
        if let Some(price) = best_buy_price {
            // Create a sell order for the unwanted tokens at or slightly below market price
            let order = &mut ctx.accounts.order;
            order.id = order_book.next_order_id;
            order.owner = ctx.accounts.user.key();
            order.wager = wager.key();
            order.is_buy = false; // We're selling the unwanted tokens
            order.is_yes_token = !is_yes_token; // Opposite of what user wants
            order.price = price.saturating_sub(1_000_000); // Slightly below best buy price for quick execution
            order.original_quantity = tokens_to_mint;
            order.remaining_quantity = tokens_to_mint;
            order.status = OrderStatus::Active;
            order.created_at = Clock::get()?.unix_timestamp;
            
            // Transfer unwanted tokens to the vault
            if !is_yes_token {
                // User wants NO tokens, so sell YES tokens
                let cpi_accounts = Transfer {
                    from: ctx.accounts.user_yes_token.to_account_info(),
                    to: ctx.accounts.yes_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::transfer(cpi_ctx, tokens_to_mint)?;
            } else {
                // User wants YES tokens, so sell NO tokens
                let cpi_accounts = Transfer {
                    from: ctx.accounts.user_no_token.to_account_info(),
                    to: ctx.accounts.no_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::transfer(cpi_ctx, tokens_to_mint)?;
            }
            
            order_book.next_order_id += 1;
            order_book.active_orders_count += 1;
            
            // Attempt to match orders
            match_orders(
                &mut ctx.accounts.order,
                &ctx.accounts.order_book,
                &ctx.accounts.platform,
                &ctx.remaining_accounts,
            )?;
            
            msg!("Created sell order for {} {} tokens at {} SOL each", 
                tokens_to_mint, 
                if !is_yes_token { "YES" } else { "NO" },
                price as f64 / 1_000_000_000.0
            );
        }
        
        msg!("Deposited {} SOL and minted {} YES and {} NO tokens", 
            sol_amount as f64 / 1_000_000_000.0,
            tokens_to_mint,
            tokens_to_mint
        );
        
        Ok(())
    }
}

// Helper function to get the best buy price from the order book
fn get_best_buy_price(order_book: &Account<OrderBook>, is_yes_token: bool) -> Result<Option<u64>> {
    // In a real implementation, you would iterate through the order book
    // to find the highest buy order price for the specified token type
    // For now, return a default market price
    Ok(Some(500_000_000)) // 0.5 SOL as default
}

// Account structures and Instruction contexts
#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::SPACE
    )]
    pub platform: Account<'info, Platform>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [b"platform_vault", platform.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a SOL vault
    pub platform_vault: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateWager<'info> {
    #[account(
        init,
        payer = wager_creator,
        space = 8 + Wager::SPACE
    )]
    pub wager: Account<'info, Wager>,
    
    #[account(
        init,
        payer = wager_creator,
        space = 8 + OrderBook::SPACE
    )]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(mut)]
    pub platform: Account<'info, Platform>,
    
    #[account(
        seeds = [b"platform_vault", platform.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a SOL vault
    pub platform_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub wager_creator: Signer<'info>,
    
    #[account(
        init,
        payer = wager_creator,
        mint::decimals = 9,
        mint::authority = wager,
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = wager_creator,
        mint::decimals = 9,
        mint::authority = wager,
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = wager_creator,
        token::mint = yes_mint,
        token::authority = wager_creator,
    )]
    pub deployer_yes_token: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = wager_creator,
        token::mint = no_mint,
        token::authority = wager_creator,
    )]
    pub deployer_no_token: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"yes_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub yes_vault: AccountInfo<'info>,
    
    #[account(
        seeds = [b"no_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub no_vault: AccountInfo<'info>,
    
    #[account(
        seeds = [b"sol_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a SOL vault
    pub sol_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = yes_mint.key() == wager.yes_mint
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = no_mint.key() == wager.no_mint
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = user_yes_token.mint == yes_mint.key(),
        constraint = user_yes_token.owner == user.key()
    )]
    pub user_yes_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_no_token.mint == no_mint.key(),
        constraint = user_no_token.owner == user.key()
    )]
    pub user_no_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"sol_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a SOL vault
    pub sol_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateOrder<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Order::SPACE
    )]
    pub order: Account<'info, Order>,
    
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(
        constraint = wager.key() == order_book.wager
    )]
    pub wager: Account<'info, Wager>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_yes_token.mint == wager.yes_mint,
        constraint = user_yes_token.owner == user.key()
    )]
    pub user_yes_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_no_token.mint == wager.no_mint,
        constraint = user_no_token.owner == user.key()
    )]
    pub user_no_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"yes_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub yes_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"no_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub no_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(
        mut,
        constraint = order.owner == user.key()
    )]
    pub order: Account<'info, Order>,
    
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(
        constraint = wager.key() == order.wager
    )]
    pub wager: Account<'info, Wager>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_yes_token.mint == wager.yes_mint,
        constraint = user_yes_token.owner == user.key()
    )]
    pub user_yes_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_no_token.mint == wager.no_mint,
        constraint = user_no_token.owner == user.key()
    )]
    pub user_no_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"yes_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub yes_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"no_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub no_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveWager<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    
    #[account(
        constraint = platform.key() == wager.platform
    )]
    pub platform: Account<'info, Platform>,
    
    #[account(
        constraint = authority.key() == platform.authority
    )]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        constraint = wager.status == WagerStatus::Resolved
    )]
    pub wager: Account<'info, Wager>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = yes_mint.key() == wager.yes_mint
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = no_mint.key() == wager.no_mint
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = user_yes_token.mint == yes_mint.key(),
        constraint = user_yes_token.owner == user.key()
    )]
    pub user_yes_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_no_token.mint == no_mint.key(),
        constraint = user_no_token.owner == user.key()
    )]
    pub user_no_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"sol_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a SOL vault
    pub sol_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyPosition<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(
        init,
        payer = user,
        space = 8 + Order::SPACE
    )]
    pub order: Account<'info, Order>,
    
    #[account(
        constraint = platform.key() == wager.platform
    )]
    pub platform: Account<'info, Platform>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        constraint = yes_mint.key() == wager.yes_mint
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        constraint = no_mint.key() == wager.no_mint
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = yes_mint,
        associated_token::authority = user
    )]
    pub user_yes_token: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = no_mint,
        associated_token::authority = user
    )]
    pub user_no_token: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"yes_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub yes_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"no_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a token vault
    pub no_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"sol_vault", wager.key().as_ref()],
        bump,
    )]
    /// CHECK: Just a SOL vault
    pub sol_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Platform {
    pub authority: Pubkey,
    pub deployment_fee: u64,
    pub trading_fee_bps: u16,
    pub wager_count: u64,
}

impl Platform {
    pub const SPACE: usize = 32 + 8 + 2 + 8;
}

#[account]
pub struct Wager {
    pub authority: Pubkey,
    pub platform: Pubkey,
    pub name: String,
    pub description: String,
    pub opening_time: i64,
    pub conclusion_time: i64,
    pub conclusion_details: String,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub yes_vault: Pubkey,
    pub no_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub status: WagerStatus,
    pub resolution: WagerResolution,
    pub index: u64,
}

impl Wager {
    pub const SPACE: usize = 32 + 32 + 50 + 500 + 8 + 8 + 500 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 8;
}

#[account]
pub struct OrderBook {
    pub wager: Pubkey,
    pub next_order_id: u64,
    pub active_orders_count: u64,
}

impl OrderBook {
    pub const SPACE: usize = 32 + 8 + 8;
}

#[account]
pub struct Order {
    pub id: u64,
    pub owner: Pubkey,
    pub wager: Pubkey,
    pub is_buy: bool,
    pub is_yes_token: bool,
    pub price: u64,
    pub original_quantity: u64,
    pub remaining_quantity: u64,
    pub status: OrderStatus,
    pub created_at: i64,
}

impl Order {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum WagerStatus {
    Created,
    Active,
    Resolved,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum WagerResolution {
    Pending,
    YesWon,
    NoWon,
    Draw,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum OrderStatus {
    Active,
    Filled,
    PartiallyFilled,
    Cancelled,
    PartiallyCancelled,
}

#[error_code]
pub enum WagerError {
    #[msg("Wager name is too long")]
    NameTooLong,
    #[msg("Wager description is too long")]
    DescriptionTooLong,
    #[msg("Conclusion details are too long")]
    ConclusionDetailsTooLong,
    #[msg("Invalid opening time")]
    InvalidOpeningTime,
    #[msg("Invalid conclusion time")]
    InvalidConclusionTime,
    #[msg("Wager must be active")]
    WagerNotActive,
    #[msg("Wager has already concluded")]
    WagerConcluded,
    #[msg("Wager has not concluded yet")]
    WagerNotConcluded,
    #[msg("Wager has not been resolved yet")]
    WagerNotResolved,
    #[msg("Only platform authority can resolve wagers")]
    NotPlatformAuthority,
    #[msg("Invalid resolution value")]
    InvalidResolution,
    #[msg("Invalid wager status for this operation")]
    InvalidWagerStatus,
    #[msg("Trading is only allowed between opening and conclusion times")]
    OutsideTradingWindow,
    #[msg("Price must be between 0 and 1 SOL")]
    InvalidPrice,
    #[msg("Only the order owner can cancel it")]
    NotOrderOwner,
    #[msg("Order is not active")]
    OrderNotActive,
    #[msg("Order has been fully filled")]
    OrderFullyFilled,
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
}book.active_orders_count = order_