pub mod platform;
pub mod wager;
pub mod order_book;
pub mod user_position;

pub use platform::*;
pub use wager::*;
pub use order_book::*;
pub use user_position::*;

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum WagerStatus {
    Created,
    Active,
    Resolved,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum Resolution {
    Pending,
    YesWon,
    NoWon,
    Draw,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum TokenType {
    Yes,
    No,
}

impl TokenType {
    pub fn to_seed(&self) -> &[u8] {
        match self {
            TokenType::Yes => b"yes",
            TokenType::No => b"no",
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum OrderSide {
    Buy,
    Sell,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum ResolutionArbitrator {
    Platform,
    AI,
    DAO,
}