use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct UserPosition {
    pub user: Pubkey,
    pub wager: Pubkey,
    pub yes_tokens_bought: u64,
    pub yes_tokens_sold: u64,
    pub no_tokens_bought: u64,
    pub no_tokens_sold: u64,
    pub total_sol_deposited: u64,
    pub total_sol_withdrawn: u64,
    pub winnings_claimed: bool,
    pub bump: u8,
}

impl UserPosition {
    pub const SIZE: usize = 8 + // discriminator
        32 + // user
        32 + // wager
        8 + // yes_tokens_bought
        8 + // yes_tokens_sold
        8 + // no_tokens_bought
        8 + // no_tokens_sold
        8 + // total_sol_deposited
        8 + // total_sol_withdrawn
        1 + // winnings_claimed
        1 + // bump
        64; // padding
}