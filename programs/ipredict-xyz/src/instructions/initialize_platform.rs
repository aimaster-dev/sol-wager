use anchor_lang::prelude::*;
use crate::state::Platform;
use crate::constants::*;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = Platform::SIZE,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform: Account<'info, Platform>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    
    platform.authority = ctx.accounts.authority.key();
    platform.fee_recipient = ctx.accounts.authority.key();
    platform.total_wagers_created = 0;
    platform.total_volume_traded = 0;
    platform.total_fees_collected = 0;
    platform.platform_fee_bps = PLATFORM_FEE_BPS;
    platform.deployer_fee_bps = DEPLOYER_FEE_BPS;
    platform.wager_creation_fee = WAGER_CREATION_FEE;
    platform.bump = ctx.bumps.platform;
    
    Ok(())
}