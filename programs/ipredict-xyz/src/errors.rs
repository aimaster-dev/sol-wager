use anchor_lang::prelude::*;

#[error_code]
pub enum IpredictError {
    #[msg("Invalid time parameters")]
    InvalidTimeParameters,
    
    #[msg("Wager not yet open")]
    WagerNotOpen,
    
    #[msg("Wager already closed")]
    WagerClosed,
    
    #[msg("Wager already resolved")]
    WagerAlreadyResolved,
    
    #[msg("Wager not yet resolvable")]
    WagerNotResolvable,
    
    #[msg("Invalid resolution")]
    InvalidResolution,
    
    #[msg("Invalid order price")]
    InvalidOrderPrice,
    
    #[msg("Invalid order quantity")]
    InvalidOrderQuantity,
    
    #[msg("Order book full")]
    OrderBookFull,
    
    #[msg("Order not found")]
    OrderNotFound,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Insufficient balance")]
    InsufficientBalance,
    
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    
    #[msg("Invalid token type")]
    InvalidTokenType,
    
    #[msg("Name too long")]
    NameTooLong,
    
    #[msg("Description too long")]
    DescriptionTooLong,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Invalid fee")]
    InvalidFee,
    
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    #[msg("Invalid escrow mint")]
    InvalidEscrowMint,
}