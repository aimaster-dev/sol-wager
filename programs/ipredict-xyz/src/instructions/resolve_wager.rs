use anchor_lang::prelude::*;
use crate::state::{Platform, Wager, WagerStatus, Resolution};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
pub struct ResolveWager<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        constraint = platform.authority == authority.key() @ IpredictError::Unauthorized
    )]
    pub platform: Account<'info, Platform>,
    
    #[account(
        mut,
        seeds = [
            WAGER_SEED,
            wager.wager_id.to_le_bytes().as_ref()
        ],
        bump = wager.bump
    )]
    pub wager: Account<'info, Wager>,
    
    pub authority: Signer<'info>,
}

pub fn resolve_wager(ctx: Context<ResolveWager>, resolution: Resolution) -> Result<()> {
    let wager = &mut ctx.accounts.wager;
    
    // Check wager status
    if wager.status == WagerStatus::Resolved {
        return Err(IpredictError::WagerAlreadyResolved.into());
    }
    
    // Check if resolution time has passed
    let clock = Clock::get()?;
    if !wager.is_resolvable(&clock) {
        return Err(IpredictError::WagerNotResolvable.into());
    }
    
    // Validate resolution
    if resolution == Resolution::Pending {
        return Err(IpredictError::InvalidResolution.into());
    }
    
    // Update wager
    wager.resolution = resolution;
    wager.status = WagerStatus::Resolved;
    
    Ok(())
}