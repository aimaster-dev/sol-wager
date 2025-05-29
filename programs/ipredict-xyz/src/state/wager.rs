use anchor_lang::prelude::*;
use crate::state::{WagerStatus, Resolution, ResolutionArbitrator};
use crate::constants::*;

#[account]
pub struct Wager {
    pub creator: Pubkey,
    pub name: String,
    pub description: String,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub vault: Pubkey,
    pub order_book: Pubkey,
    pub opening_time: i64,
    pub closing_time: i64,
    pub resolution_time: i64,
    pub status: WagerStatus,
    pub resolution: Resolution,
    pub resolution_arbitrator: ResolutionArbitrator,
    pub total_yes_tokens: u64,
    pub total_no_tokens: u64,
    pub total_sol_deposited: u64,
    pub total_volume_traded: u64,
    pub total_fees_collected: u64,
    pub wager_id: u64,
    pub bump: u8,
}

impl Wager {
    pub const SIZE: usize = 8 + // discriminator
        32 + // creator
        4 + MAX_NAME_LENGTH + // name
        4 + MAX_DESCRIPTION_LENGTH + // description
        32 + // yes_mint
        32 + // no_mint
        32 + // vault
        32 + // order_book
        8 + // opening_time
        8 + // closing_time
        8 + // resolution_time
        1 + // status
        1 + // resolution
        1 + // resolution_arbitrator
        8 + // total_yes_tokens
        8 + // total_no_tokens
        8 + // total_sol_deposited
        8 + // total_volume_traded
        8 + // total_fees_collected
        8 + // wager_id
        1 + // bump
        128; // padding
    
    pub fn is_open(&self, clock: &Clock) -> bool {
        self.status == WagerStatus::Active && 
        clock.unix_timestamp >= self.opening_time && 
        clock.unix_timestamp < self.closing_time
    }
    
    pub fn is_resolvable(&self, clock: &Clock) -> bool {
        self.status == WagerStatus::Active && 
        clock.unix_timestamp >= self.resolution_time
    }
}