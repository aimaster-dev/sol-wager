use anchor_lang::prelude::*;
use crate::state::{Wager, UserPosition};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
pub struct DepositSol<'info> {
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
        init_if_needed,
        payer = user,
        space = UserPosition::SIZE,
        seeds = [USER_POSITION_SEED, user.key().as_ref(), wager.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, wager.key().as_ref()],
        bump
    )]
    /// CHECK: This is the vault PDA
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
    let wager = &mut ctx.accounts.wager;
    let user_position = &mut ctx.accounts.user_position;
    
    // Check wager is active
    let clock = Clock::get()?;
    if wager.status != crate::state::WagerStatus::Active {
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
    
    // Initialize user position if needed
    if user_position.user == Pubkey::default() {
        user_position.user = ctx.accounts.user.key();
        user_position.wager = wager.key();
        user_position.bump = ctx.bumps.user_position;
    }
    
    // Update stats
    wager.total_sol_deposited += amount;
    user_position.total_sol_deposited += amount;
    
    msg!("User {} deposited {} lamports", ctx.accounts.user.key(), amount);
    
    Ok(())
}