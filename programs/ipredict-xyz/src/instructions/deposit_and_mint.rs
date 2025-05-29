use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Wager, UserPosition, WagerStatus};
use crate::constants::*;
use crate::errors::IpredictError;

#[derive(Accounts)]
pub struct DepositAndMint<'info> {
    #[account(
        mut,
        seeds = [
            WAGER_SEED,
            wager.wager_id.to_le_bytes().as_ref()
        ],
        bump = wager.bump
    )]
    pub wager: Box<Account<'info, Wager>>,
    
    #[account(
        mut,
        seeds = [b"yes_mint", wager.key().as_ref()],
        bump
    )]
    pub yes_mint: Box<Account<'info, Mint>>,
    
    #[account(
        mut,
        seeds = [b"no_mint", wager.key().as_ref()],
        bump
    )]
    pub no_mint: Box<Account<'info, Mint>>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = yes_mint,
        associated_token::authority = user
    )]
    pub user_yes_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = no_mint,
        associated_token::authority = user
    )]
    pub user_no_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::SIZE,
        seeds = [USER_POSITION_SEED, user.key().as_ref(), wager.key().as_ref()],
        bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, wager.key().as_ref()],
        bump
    )]
    /// CHECK: This is the vault PDA
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_and_mint(ctx: Context<DepositAndMint>, amount: u64) -> Result<()> {
    let wager = &mut ctx.accounts.wager;
    let user_position = &mut ctx.accounts.user_position;
    
    // Check wager is active
    let clock = Clock::get()?;
    if !wager.is_open(&clock) {
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
    
    // Calculate tokens to mint (100 tokens per SOL)
    let tokens_to_mint = amount
        .checked_mul(TOKENS_PER_SOL)
        .ok_or(IpredictError::MathOverflow)?
        .checked_div(LAMPORTS_PER_SOL)
        .ok_or(IpredictError::MathOverflow)?;
    
    // Create signer seeds for the wager PDA
    let wager_id_bytes = wager.wager_id.to_le_bytes();
    let seeds = &[
        WAGER_SEED,
        wager_id_bytes.as_ref(),
        &[wager.bump],
    ];
    let signer = &[&seeds[..]];
    
    // Mint YES tokens
    let cpi_accounts = MintTo {
        mint: ctx.accounts.yes_mint.to_account_info(),
        to: ctx.accounts.user_yes_account.to_account_info(),
        authority: wager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::mint_to(cpi_ctx, tokens_to_mint)?;
    
    // Mint NO tokens
    let cpi_accounts = MintTo {
        mint: ctx.accounts.no_mint.to_account_info(),
        to: ctx.accounts.user_no_account.to_account_info(),
        authority: wager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::mint_to(cpi_ctx, tokens_to_mint)?;
    
    // Update wager stats
    wager.total_yes_tokens = wager.total_yes_tokens
        .checked_add(tokens_to_mint)
        .ok_or(IpredictError::MathOverflow)?;
    wager.total_no_tokens = wager.total_no_tokens
        .checked_add(tokens_to_mint)
        .ok_or(IpredictError::MathOverflow)?;
    wager.total_sol_deposited = wager.total_sol_deposited
        .checked_add(amount)
        .ok_or(IpredictError::MathOverflow)?;
    
    // Initialize user position if needed
    if user_position.user == Pubkey::default() {
        user_position.user = ctx.accounts.user.key();
        user_position.wager = wager.key();
        user_position.bump = ctx.bumps.user_position;
    }
    
    // Update user position stats
    user_position.total_sol_deposited = user_position.total_sol_deposited
        .checked_add(amount)
        .ok_or(IpredictError::MathOverflow)?;
    
    msg!("Deposited {} SOL, minted {} YES and NO tokens", 
        amount as f64 / LAMPORTS_PER_SOL as f64,
        tokens_to_mint
    );
    
    Ok(())
}