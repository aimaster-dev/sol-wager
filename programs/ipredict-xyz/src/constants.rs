use anchor_lang::prelude::*;

pub const PLATFORM_SEED: &[u8] = b"platform";
pub const WAGER_SEED: &[u8] = b"wager";
pub const VAULT_SEED: &[u8] = b"vault";
pub const ORDER_BOOK_SEED: &[u8] = b"order_book";
pub const ORDER_SEED: &[u8] = b"order";
pub const USER_POSITION_SEED: &[u8] = b"user_position";

pub const TOKENS_PER_SOL: u64 = 100;
pub const LAMPORTS_PER_TOKEN: u64 = 10_000_000; // 0.01 SOL
pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
pub const PLATFORM_FEE_BPS: u16 = 25; // 0.25%
pub const DEPLOYER_FEE_BPS: u16 = 25; // 0.25%
pub const TOTAL_FEE_BPS: u16 = 50; // 0.5%
pub const BPS_DIVISOR: u64 = 10_000;

pub const MAX_NAME_LENGTH: usize = 200;
pub const MAX_DESCRIPTION_LENGTH: usize = 1000;
pub const MAX_ORDERS_PER_BOOK: usize = 1000;

pub const WAGER_CREATION_FEE: u64 = 1_000_000_000; // 1 SOL