use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Platform, Wager, OrderBook, WagerStatus, Resolution, ResolutionArbitrator};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateWager<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, Platform>,
    
    #[account(
        init,
        payer = creator,
        space = Wager::SIZE,
        seeds = [
            WAGER_SEED,
            platform.total_wagers_created.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub wager: Account<'info, Wager>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = 0,
        mint::authority = wager,
        seeds = [b"yes_mint", wager.key().as_ref()],
        bump
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = 0,
        mint::authority = wager,
        seeds = [b"no_mint", wager.key().as_ref()],
        bump
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = creator,
        space = OrderBook::SIZE,
        seeds = [ORDER_BOOK_SEED, wager.key().as_ref()],
        bump
    )]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(
        init,
        payer = creator,
        seeds = [VAULT_SEED, wager.key().as_ref()],
        bump,
        space = 8
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(mut)]
    pub fee_recipient: SystemAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_wager(
    ctx: Context<CreateWager>,
    name: String,
    description: String,
    opening_time: i64,
    closing_time: i64,
    resolution_time: i64,
) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    let wager = &mut ctx.accounts.wager;
    let order_book = &mut ctx.accounts.order_book;
    
    // Validate inputs
    if name.len() > MAX_NAME_LENGTH {
        return Err(IpredictError::NameTooLong.into());
    }
    if description.len() > MAX_DESCRIPTION_LENGTH {
        return Err(IpredictError::DescriptionTooLong.into());
    }
    
    let clock = Clock::get()?;
    if opening_time < clock.unix_timestamp || 
       closing_time <= opening_time || 
       resolution_time < closing_time {
        return Err(IpredictError::InvalidTimeParameters.into());
    }
    
    // Transfer creation fee
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: ctx.accounts.fee_recipient.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, platform.wager_creation_fee)?;
    
    // Initialize wager
    wager.creator = ctx.accounts.creator.key();
    wager.name = name;
    wager.description = description;
    wager.yes_mint = ctx.accounts.yes_mint.key();
    wager.no_mint = ctx.accounts.no_mint.key();
    wager.vault = ctx.accounts.vault.key();
    wager.order_book = order_book.key();
    wager.opening_time = opening_time;
    wager.closing_time = closing_time;
    wager.resolution_time = resolution_time;
    wager.status = WagerStatus::Created;
    wager.resolution = Resolution::Pending;
    wager.resolution_arbitrator = ResolutionArbitrator::Platform;
    wager.total_yes_tokens = 0;
    wager.total_no_tokens = 0;
    wager.total_sol_deposited = 0;
    wager.total_volume_traded = 0;
    wager.total_fees_collected = 0;
    wager.wager_id = platform.total_wagers_created;
    wager.bump = ctx.bumps.wager;
    
    // Initialize order book
    order_book.wager = wager.key();
    order_book.next_order_id = 0;
    order_book.buy_orders_yes = Vec::new();
    order_book.sell_orders_yes = Vec::new();
    order_book.buy_orders_no = Vec::new();
    order_book.sell_orders_no = Vec::new();
    order_book.bump = ctx.bumps.order_book;
    
    // Update platform stats
    platform.total_wagers_created += 1;
    
    // Activate wager if opening time has passed
    if clock.unix_timestamp >= opening_time {
        wager.status = WagerStatus::Active;
    }
    
    Ok(())
}