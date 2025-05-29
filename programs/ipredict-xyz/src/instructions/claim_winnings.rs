use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Burn, Mint};
use crate::state::{Wager, UserPosition, WagerStatus, Resolution};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
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
        seeds = [USER_POSITION_SEED, user.key().as_ref(), wager.key().as_ref()],
        bump = user_position.bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(
        mut,
        associated_token::mint = wager.yes_mint,
        associated_token::authority = user
    )]
    pub user_yes_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        associated_token::mint = wager.no_mint,
        associated_token::authority = user
    )]
    pub user_no_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        seeds = [b"yes_mint", wager.key().as_ref()],
        bump
    )]
    pub yes_mint: Box<Account<'info, Mint>>,
    
    #[account(
        mut,
        seeds = [b"no_mint", wager.key().as_ref()],
        bump
    )]
    pub no_mint: Box<Account<'info, Mint>>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, wager.key().as_ref()],
        bump
    )]
    /// CHECK: This is the vault PDA
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
    let wager = &ctx.accounts.wager;
    let user_position = &mut ctx.accounts.user_position;
    
    // Check wager is resolved
    if wager.status != WagerStatus::Resolved {
        return Err(IpredictError::WagerNotResolvable.into());
    }
    
    // Check not already claimed
    if user_position.winnings_claimed {
        return Err(IpredictError::Unauthorized.into());
    }
    
    let mut winning_tokens = 0u64;
    let winning_mint: AccountInfo;
    let winning_account: &TokenAccount;
    
    match wager.resolution {
        Resolution::YesWon => {
            winning_tokens = ctx.accounts.user_yes_account.amount;
            winning_mint = ctx.accounts.yes_mint.to_account_info();
            winning_account = &**ctx.accounts.user_yes_account;
        }
        Resolution::NoWon => {
            winning_tokens = ctx.accounts.user_no_account.amount;
            winning_mint = ctx.accounts.no_mint.to_account_info();
            winning_account = &**ctx.accounts.user_no_account;
        }
        Resolution::Draw => {
            // In case of draw, users can claim based on total tokens
            let yes_tokens = ctx.accounts.user_yes_account.amount;
            let no_tokens = ctx.accounts.user_no_account.amount;
            let total_tokens = yes_tokens.checked_add(no_tokens).ok_or(IpredictError::MathOverflow)?;
            
            if total_tokens > 0 {
                // Calculate payout (half value for draw)
                let payout = total_tokens
                    .checked_mul(LAMPORTS_PER_TOKEN)
                    .ok_or(IpredictError::MathOverflow)?
                    .checked_div(2)
                    .ok_or(IpredictError::MathOverflow)?;
                
                // Burn YES tokens if any
                if yes_tokens > 0 {
                    let cpi_accounts = Burn {
                        mint: ctx.accounts.yes_mint.to_account_info(),
                        from: ctx.accounts.user_yes_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                    token::burn(cpi_ctx, yes_tokens)?;
                }
                
                // Burn NO tokens if any
                if no_tokens > 0 {
                    let cpi_accounts = Burn {
                        mint: ctx.accounts.no_mint.to_account_info(),
                        from: ctx.accounts.user_no_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                    token::burn(cpi_ctx, no_tokens)?;
                }
                
                // Transfer SOL from vault
                let wager_key = wager.key();
                let vault_seeds = &[
                    VAULT_SEED,
                    wager_key.as_ref(),
                    &[ctx.bumps.vault],
                ];
                let vault_signer = &[&vault_seeds[..]];
                
                let cpi_context = CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.user.to_account_info(),
                    },
                    vault_signer,
                );
                anchor_lang::system_program::transfer(cpi_context, payout)?;
                
                user_position.total_sol_withdrawn = user_position.total_sol_withdrawn
                    .checked_add(payout)
                    .ok_or(IpredictError::MathOverflow)?;
                
                msg!("Draw resolution: claimed {} SOL for {} total tokens", 
                    payout as f64 / LAMPORTS_PER_SOL as f64,
                    total_tokens
                );
            }
            
            user_position.winnings_claimed = true;
            return Ok(());
        }
        _ => return Err(IpredictError::InvalidResolution.into()),
    }
    
    if winning_tokens > 0 {
        // Calculate payout (full value for winners)
        let payout = winning_tokens
            .checked_mul(LAMPORTS_PER_TOKEN)
            .ok_or(IpredictError::MathOverflow)?;
        
        // Burn winning tokens
        let cpi_accounts = Burn {
            mint: winning_mint,
            from: winning_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, winning_tokens)?;
        
        // Transfer SOL from vault
        let wager_key = wager.key();
        let vault_seeds = &[
            VAULT_SEED,
            wager_key.as_ref(),
            &[ctx.bumps.vault],
        ];
        let vault_signer = &[&vault_seeds[..]];
        
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            vault_signer,
        );
        anchor_lang::system_program::transfer(cpi_context, payout)?;
        
        user_position.total_sol_withdrawn = user_position.total_sol_withdrawn
            .checked_add(payout)
            .ok_or(IpredictError::MathOverflow)?;
        
        msg!(
            "Claimed {} SOL for {} winning {} tokens",
            payout as f64 / LAMPORTS_PER_SOL as f64,
            winning_tokens,
            match wager.resolution {
                Resolution::YesWon => "YES",
                Resolution::NoWon => "NO",
                _ => "UNKNOWN"
            }
        );
    }
    
    user_position.winnings_claimed = true;
    
    Ok(())
}