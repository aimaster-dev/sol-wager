use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Platform {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub total_wagers_created: u64,
    pub total_volume_traded: u64,
    pub total_fees_collected: u64,
    pub platform_fee_bps: u16,
    pub deployer_fee_bps: u16,
    pub wager_creation_fee: u64,
    pub bump: u8,
}

impl Platform {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        32 + // fee_recipient
        8 + // total_wagers_created
        8 + // total_volume_traded
        8 + // total_fees_collected
        2 + // platform_fee_bps
        2 + // deployer_fee_bps
        8 + // wager_creation_fee
        1 + // bump
        64; // padding
}