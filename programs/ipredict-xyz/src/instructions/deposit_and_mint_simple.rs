use anchor_lang::prelude::*;
use crate::state::{Wager, WagerStatus};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
pub struct DepositAndMintSimple<'info> {
    #[account(
        mut,
        seeds = [
            WAGER_SEED,
            wager.wager_id.to_le_bytes().as_ref()
        ],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, wager.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn deposit_and_mint_simple(ctx: Context<DepositAndMintSimple>, amount: u64) -> Result<()> {
    let wager = &mut ctx.accounts.wager;
    
    // Check wager is active
    let clock = Clock::get()?;
    if !wager.is_open(&clock) {
        return Err(IpredictError::WagerNotOpen.into());
    }
    
    // Transfer SOL to vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)?;
    
    // Update wager stats (simplified - no actual token minting in MVP)
    wager.total_sol_deposited += amount;
    
    msg!("Deposited {} lamports to vault", amount);
    
    Ok(())
}