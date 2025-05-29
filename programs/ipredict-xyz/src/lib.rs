use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod ipredict_xyz {
    use super::*;

    /// Initialize the platform (one-time setup)
    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        instructions::initialize_platform(ctx)
    }

    /// Create a new prediction market
    pub fn create_wager(
        ctx: Context<CreateWager>,
        name: String,
        description: String,
        opening_time: i64,
        closing_time: i64,
        resolution_time: i64,
    ) -> Result<()> {
        instructions::create_wager(
            ctx,
            name,
            description,
            opening_time,
            closing_time,
            resolution_time,
        )
    }

    /// Deposit SOL and mint YES/NO tokens
    pub fn deposit_and_mint(ctx: Context<DepositAndMint>, amount: u64) -> Result<()> {
        instructions::deposit_and_mint(ctx, amount)
    }

    /// Place a buy or sell order
    pub fn place_order(
        ctx: Context<PlaceOrder>,
        side: OrderSide,
        token_type: TokenType,
        price: u64,
        quantity: u64,
    ) -> Result<()> {
        instructions::place_order(ctx, side, token_type, price, quantity)
    }

    /// Cancel an existing order
    pub fn cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
        instructions::cancel_order(ctx, order_id)
    }

    /// Match compatible orders
    pub fn match_orders(
        ctx: Context<MatchOrders>,
        max_iterations: u8,
    ) -> Result<()> {
        instructions::match_orders(ctx, max_iterations)
    }

    /// Quick buy tokens at market price
    pub fn quick_buy(
        ctx: Context<QuickBuy>,
        token_type: TokenType,
        sol_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        instructions::quick_buy(ctx, token_type, sol_amount, min_tokens_out)
    }

    /// Resolve a wager with the outcome
    pub fn resolve_wager(ctx: Context<ResolveWager>, resolution: Resolution) -> Result<()> {
        instructions::resolve_wager(ctx, resolution)
    }

    /// Claim winnings after resolution
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings(ctx)
    }
}