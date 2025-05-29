# iPredict XYZ Architecture

## Overview

iPredict XYZ is built as a fully decentralized prediction market platform on Solana. The architecture consists of three main layers:

1. **On-Chain Programs** (Rust/Anchor)
2. **SDK Layer** (TypeScript)
3. **Frontend Application** (Next.js)

## On-Chain Architecture

### Program Structure

```
programs/ipredict-xyz/
├── src/
│   ├── lib.rs              # Program entry point
│   ├── constants.rs        # Global constants
│   ├── errors.rs           # Custom error types
│   ├── state/              # Account structures
│   │   ├── platform.rs     # Platform configuration
│   │   ├── wager.rs        # Market/wager state
│   │   ├── order_book.rs   # Order book with embedded orders
│   │   └── user_position.rs # User position tracking
│   └── instructions/       # Program instructions (9 total)
│       ├── initialize_platform.rs
│       ├── create_wager.rs
│       ├── deposit_and_mint.rs
│       ├── place_order.rs
│       ├── cancel_order.rs
│       ├── match_orders.rs
│       ├── quick_buy.rs
│       ├── resolve_wager.rs
│       └── claim_winnings.rs
```

### Account Model

#### Platform Account (Singleton)
```rust
Platform {
    authority: Pubkey,              // Resolution authority
    fee_recipient: Pubkey,          // Platform fee destination
    deployer_fee_recipient: Pubkey, // Deployer fee destination
    wager_creation_fee: u64,        // 1 SOL
    platform_fee_bps: u16,          // 25 (0.25%)
    deployer_fee_bps: u16,          // 25 (0.25%)
    total_wagers_created: u64,
    total_volume_traded: u64,
    total_fees_collected: u64,
    bump: u8,
}
```

#### Wager Account
```rust
Wager {
    creator: Pubkey,
    name: String,                   // Max 200 chars
    description: String,            // Max 1000 chars
    yes_mint: Pubkey,              // YES token mint
    no_mint: Pubkey,               // NO token mint
    vault: Pubkey,                 // SOL vault PDA
    order_book: Pubkey,            // Associated order book
    opening_time: i64,
    closing_time: i64,
    resolution_time: i64,
    status: WagerStatus,           // Created/Active/Resolved
    resolution: Resolution,        // Pending/YesWon/NoWon/Draw
    resolution_arbitrator: ResolutionArbitrator,
    total_yes_tokens: u64,
    total_no_tokens: u64,
    total_sol_deposited: u64,
    total_volume_traded: u64,
    total_fees_collected: u64,
    wager_id: u64,
    bump: u8,
}
```

#### Order Book Account
```rust
OrderBook {
    wager: Pubkey,
    next_order_id: u64,
    buy_orders_yes: Vec<Order>,    // Max 1000 orders
    sell_orders_yes: Vec<Order>,   // Max 1000 orders
    buy_orders_no: Vec<Order>,     // Max 1000 orders
    sell_orders_no: Vec<Order>,    // Max 1000 orders
    bump: u8,
}

// Orders are stored as structs within arrays, not separate accounts
Order {
    id: u64,
    owner: Pubkey,
    side: OrderSide,               // Buy/Sell
    token_type: TokenType,         // Yes/No
    price: u64,                    // Lamports per token (max 0.01 SOL)
    quantity: u64,
    filled_quantity: u64,
    timestamp: i64,
}
```

#### User Position Account
```rust
UserPosition {
    user: Pubkey,
    wager: Pubkey,
    yes_tokens_bought: u64,
    yes_tokens_sold: u64,
    no_tokens_bought: u64,
    no_tokens_sold: u64,
    total_sol_deposited: u64,
    total_sol_withdrawn: u64,
    winnings_claimed: bool,
    bump: u8,
}
```

### Token System

Each wager creates two SPL tokens:
- **YES Token**: Burns for 0.01 SOL if proposition is true
- **NO Token**: Burns for 0.01 SOL if proposition is false

Token flow:
1. User deposits 1 SOL → Receives 100 YES + 100 NO tokens
2. Tokens are freely tradeable on the order book
3. Sell orders transfer tokens to escrow PDAs
4. Winners burn tokens to claim SOL after resolution

### Escrow System

Sell orders use PDA-based escrow accounts:
- Separate escrow for YES and NO tokens
- Tokens locked when sell order placed
- Released on order fill or cancellation
- PDA seeds: `[b"escrow", wager.key(), b"yes"|b"no"]`

### Order Matching Engine

The on-chain order book implements:
- Price-time priority matching
- Partial order fills
- In-place order updates (no separate accounts)
- Atomic execution with escrow transfers

Matching algorithm:
1. Sort buy orders by price descending, time ascending
2. Sort sell orders by price ascending, time ascending
3. Match when buy price ≥ sell price
4. Execute at average of buy/sell prices
5. Remove fully filled orders

## SDK Architecture

The TypeScript SDK provides:
- Type-safe program interaction
- Transaction building and signing
- Account fetching and parsing
- PDA derivation helpers

Key components:
```typescript
IpredictClient         // Main client interface
getPlatformPDA()       // Platform account derivation
getWagerPDA()          // Wager account derivation
getVaultPDA()          // Vault PDA derivation
getOrderBookPDA()      // Order book derivation
getUserPositionPDA()   // User position derivation
getYesMintPDA()        // YES mint derivation
getNoMintPDA()         // NO mint derivation
getEscrowPDA()         // Escrow account derivation
```

## Frontend Architecture

Built with Next.js 14 and React:
- App Router for navigation
- Server Components for static content
- Client Components for wallet interaction
- Tailwind CSS for styling
- Wallet Adapter for multi-wallet support

Page structure:
```
app/
├── page.tsx              # Home page
├── markets/page.tsx      # Market listing
├── create/page.tsx       # Create market form
├── wager/[id]/page.tsx   # Market trading page
└── portfolio/page.tsx    # User positions
```

## Data Flow

### Creating a Market
```mermaid
User → Frontend → SDK → create_wager instruction → Program
                                                     ↓
                                              Creates: Wager
                                                      YES Mint
                                                      NO Mint
                                                      Vault
                                                      OrderBook
```

### Trading Flow
```mermaid
Deposit: User → deposit_and_mint → Vault (SOL) → Mints (YES/NO tokens)
Trade:   User → place_order → OrderBook (if sell → Escrow)
Match:   Anyone → match_orders → Execute trades → Update balances
```

### Resolution Flow
```mermaid
Authority → resolve_wager → Update status/resolution
Users → claim_winnings → Burn winning tokens → Receive SOL from vault
```

## Security Model

### Access Control
- Platform authority only for resolution
- User can only cancel own orders
- PDAs ensure deterministic addressing
- No upgrade authority after deployment

### Fund Safety
- All SOL locked in program vaults
- Escrow PDAs hold sell order tokens
- No emergency withdrawal functions
- Atomic operations prevent partial states

### Validation
- Time parameters checked (opening < closing < resolution)
- Price bounds enforced (0 < price ≤ 0.01 SOL)
- Overflow protection on all arithmetic
- Balance checks before transfers

## Performance Optimizations

### Account Sizing
- Fixed-size arrays for orders (max 1000 per type)
- Efficient packing of struct fields
- Box<Account> for stack optimization

### Compute Efficiency
- Batch order matching (configurable iterations)
- In-place order updates
- Minimal CPI calls
- Early returns on validation failures

## Limitations & Considerations

### Current Limitations
- No automated resolution (manual only)
- No emergency pause mechanism
- Fixed fee structure
- Maximum 1000 orders per token type
- No order modification (cancel and replace only)

### Production Considerations
- Add comprehensive test coverage
- Implement monitoring and alerts
- Add rate limiting for spam protection
- Consider upgrade authority for emergencies
- Add oracle integration for automated resolution

## Deployment Architecture

### Local Development
- Local validator for testing
- Automatic platform initialization
- Test scripts for all functions

### Production Deployment
- Separate program accounts per network
- Environment-specific configurations
- Multi-sig for platform authority
- Monitoring and logging infrastructure