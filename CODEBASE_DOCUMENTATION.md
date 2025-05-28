# Wagers.bet - Complete Codebase Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Solana Program (Smart Contract)](#solana-program-smart-contract)
5. [Frontend Application](#frontend-application)
6. [Order Matching System](#order-matching-system)
7. [Token Economics](#token-economics)
8. [User Workflows](#user-workflows)
9. [Technical Implementation Details](#technical-implementation-details)
10. [Security Considerations](#security-considerations)
11. [Deployment and Configuration](#deployment-and-configuration)

## Project Overview

Wagers.bet is a decentralized prediction market platform built on the Solana blockchain. It allows users to create and trade on the outcomes of future events through a unique dual-token system. The platform operates entirely on-chain with no centralized components beyond the initial deployment.

### Key Features
- **Decentralized Wager Creation**: Any user can create proposition wagers about future events
- **Dual-Token System**: Each wager has YES and NO tokens representing different outcomes
- **Automated Market Making**: Built-in order book system for price discovery
- **Atomic Trading**: New "Quick Buy" feature for simplified position taking
- **On-Chain Resolution**: Platform authority resolves wagers based on real-world outcomes
- **Instant Settlement**: Winners can claim their SOL immediately after resolution

## Architecture

The system consists of three main components:

### 1. Solana Program (Rust)
- Core smart contract logic
- Order matching engine
- Token minting and burning
- Settlement mechanisms

### 2. React Frontend
- User interface for interacting with wagers
- Real-time order book display
- Wallet integration (Phantom, Solflare, etc.)
- Position management dashboard

### 3. TypeScript SDK
- Client library for program interaction
- Transaction building and signing
- Data fetching and caching
- Mock mode for development

## Core Concepts

### Wagers
A wager represents a proposition about a future event with a binary outcome. Each wager contains:
- **Metadata**: Name, description, and resolution criteria
- **Timeline**: Opening time, conclusion time
- **Token Mints**: YES and NO token addresses
- **Vaults**: Token and SOL storage accounts
- **Status**: Created, Active, or Resolved
- **Resolution**: Pending, YesWon, NoWon, or Draw

### Dual-Token System
Each wager creates two tokens:
- **YES Token**: Pays out 1 SOL if the proposition is true
- **NO Token**: Pays out 1 SOL if the proposition is false

Users deposit SOL to mint equal amounts of both tokens, ensuring the system remains balanced.

### Order Book
Each wager has an associated order book where users can:
- Place buy/sell orders for YES or NO tokens
- Set their own prices (0-1 SOL per token)
- Have orders automatically matched
- Cancel unfilled orders

## Solana Program (Smart Contract)

Located in `/programs/general-wager-bet/src/lib.rs`, the program implements seven main instructions:

### 1. Initialize Platform
```rust
pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()>
```
- Sets up the global platform account
- Configures fees and authority
- Creates platform vault for fee collection
- One-time setup by deployer

### 2. Create Wager
```rust
pub fn create_wager(
    ctx: Context<CreateWager>,
    name: String,
    description: String,
    opening_time: i64,
    conclusion_time: i64,
    conclusion_details: String
) -> Result<()>
```
- Creates new wager with metadata
- Deploys YES and NO token mints
- Sets up token vaults and SOL vault
- Initializes order book
- Charges deployment fee to creator

### 3. Deposit SOL
```rust
pub fn deposit_sol(
    ctx: Context<DepositSol>,
    amount: u64
) -> Result<()>
```
- Accepts SOL from users
- Mints 100 YES + 100 NO tokens per SOL
- Stores SOL in wager vault for payouts
- Maintains 1:1 payout ratio

### 4. Create Order
```rust
pub fn create_order(
    ctx: Context<CreateOrder>,
    is_buy: bool,
    is_yes_token: bool,
    price: u64,
    quantity: u64
) -> Result<()>
```
- Creates buy or sell order
- Transfers tokens/SOL to escrow
- Attempts immediate matching
- Stores unmatched orders in book

### 5. Cancel Order
```rust
pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()>
```
- Cancels active order
- Returns escrowed assets
- Updates order book state
- Only order owner can cancel

### 6. Resolve Wager
```rust
pub fn resolve_wager(
    ctx: Context<ResolveWager>,
    resolution: u8
) -> Result<()>
```
- Sets final outcome (YES/NO/Draw)
- Prevents further trading
- Enables winner claims
- Platform authority only

### 7. Claim Winnings
```rust
pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()>
```
- Burns winning tokens
- Transfers SOL payout (0.01 per token)
- Handles draw scenarios (50% refund)
- One claim per user

### 8. Buy Position (New)
```rust
pub fn buy_position(
    ctx: Context<BuyPosition>,
    is_yes_token: bool,
    sol_amount: u64
) -> Result<()>
```
- Atomic operation for simplified trading
- Deposits SOL and mints tokens
- Automatically sells unwanted tokens
- Provides one-click position entry

## Frontend Application

The React application in `/app/src/` provides the user interface:

### Key Components

#### App.tsx
- Main application container
- Wallet adapter setup
- Client initialization
- Routing logic

#### Dashboard.tsx
- Lists all active wagers
- Shows wager statistics
- Quick navigation to details
- Real-time status updates

#### WagerDetails.tsx
- Complete wager information
- Trading interface (Quick Buy + Advanced)
- Order book display
- Position management
- Admin resolution controls

#### QuickBuy.tsx (New)
- Simplified YES/NO selection
- Real-time price calculation
- One-click position buying
- Price impact warnings

#### MyBets.tsx
- User's position dashboard
- Token balance tracking
- Claim interface
- Position history

#### OrderBook.tsx
- Live order display
- Buy/sell order separation
- Price/quantity visualization
- Order cancellation

### Client SDK

The TypeScript client (`general-wager-bet-client.ts`) provides:

#### Core Methods
- `initializePlatform()`: One-time platform setup
- `createWager()`: Deploy new prediction market
- `depositSol()`: Convert SOL to tokens
- `createOrder()`: Place buy/sell orders
- `cancelOrder()`: Cancel active orders
- `resolveWager()`: Set final outcome
- `claimWinnings()`: Collect payouts
- `buyPosition()`: Simplified trading

#### Helper Methods
- `getAllWagers()`: Fetch active markets
- `getWagerDetails()`: Single wager data
- `getOrdersForWager()`: Order book data
- `getUserTokenBalances()`: Position info
- `calculatePositionCost()`: Price estimation

## Order Matching System

The order matching engine (`order_matching.rs`) implements:

### Matching Logic
```rust
pub fn match_orders(
    new_order: &mut Account<Order>,
    order_book: &Account<OrderBook>,
    platform: &Account<Platform>,
    remaining_accounts: &[AccountInfo]
) -> Result<()>
```

### Features
- Price-time priority matching
- Partial fill support
- Platform fee deduction
- Atomic settlement
- Gas-efficient design

### Matching Rules
1. Orders match if:
   - Opposite sides (buy vs sell)
   - Same token type
   - Buy price ≥ Sell price
2. Execution price is sell order price
3. Platform takes 0.5% fee
4. Partial fills update remaining quantity

## Token Economics

### Minting
- 1 SOL deposits create 100 YES + 100 NO tokens
- Total token supply = Total SOL deposited × 100
- Balanced creation maintains system solvency

### Trading
- Tokens trade between 0-1 SOL
- Sum of YES + NO prices trends toward 1 SOL
- Market pricing reflects outcome probability

### Settlement
- Winning tokens redeem for 0.01 SOL each
- Losing tokens become worthless
- Draw returns 0.005 SOL per token

### Fees
- Platform deployment: 1 SOL
- Trading fee: 0.5% of transaction
- No deposit or withdrawal fees

## User Workflows

### Creating a Wager
1. User connects wallet
2. Fills wager details form
3. Pays 1 SOL deployment fee
4. Wager becomes active at opening time

### Taking a Position (Quick Buy)
1. Select wager from dashboard
2. Click YES or NO button
3. Enter SOL amount
4. Review price preview
5. Confirm transaction
6. Receive desired tokens, unwanted tokens auto-sold

### Advanced Trading
1. Deposit SOL to get both tokens
2. Place limit orders at desired prices
3. Wait for matches or cancel orders
4. Manage position over time

### Claiming Winnings
1. Wait for wager resolution
2. Navigate to My Bets
3. Click claim for winning positions
4. Receive SOL payout

## Technical Implementation Details

### Account Structure
```rust
Platform {
    authority: Pubkey,
    deployment_fee: u64,
    trading_fee_bps: u16,
    wager_count: u64,
}

Wager {
    authority: Pubkey,
    platform: Pubkey,
    name: String,
    description: String,
    opening_time: i64,
    conclusion_time: i64,
    conclusion_details: String,
    yes_mint: Pubkey,
    no_mint: Pubkey,
    yes_vault: Pubkey,
    no_vault: Pubkey,
    sol_vault: Pubkey,
    status: WagerStatus,
    resolution: WagerResolution,
    index: u64,
}

Order {
    id: u64,
    owner: Pubkey,
    wager: Pubkey,
    is_buy: bool,
    is_yes_token: bool,
    price: u64,
    original_quantity: u64,
    remaining_quantity: u64,
    status: OrderStatus,
    created_at: i64,
}
```

### PDA Derivations
- Platform: `["platform"]`
- Platform Vault: `["platform_vault", platform_key]`
- Order Book: `["order_book", wager_key]`
- Token Vaults: `["yes_vault"/"no_vault", wager_key]`
- SOL Vault: `["sol_vault", wager_key]`

### Error Handling
Custom errors provide clear feedback:
- `WagerNotActive`: Trading outside allowed time
- `InsufficientBalance`: Not enough tokens/SOL
- `InvalidResolution`: Bad resolution value
- `OrderNotFound`: Matching engine errors
- `Unauthorized`: Permission violations

## Security Considerations

### Access Control
- Platform authority manages resolutions
- Only owners can cancel orders
- Wager creators can't modify after creation
- User funds held in program-controlled vaults

### Economic Security
- Balanced token creation prevents inflation
- Escrow system prevents double-spending
- Atomic swaps ensure fair trades
- Fee structure prevents spam

### Technical Security
- Input validation on all parameters
- Overflow protection in calculations
- Reentrancy guards on transfers
- PDA seeds prevent account confusion

## Deployment and Configuration

### Prerequisites
- Solana CLI tools
- Anchor framework 0.28.0
- Node.js 16+ and Yarn
- Rust 1.70+

### Program Deployment
```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run migrations
ts-node migrations/deploy.ts devnet
```

### Frontend Setup
```bash
# Install dependencies
cd app && npm install

# Configure environment
cp .env.example .env
# Edit .env with your RPC endpoint

# Start development server
npm start

# Build for production
npm run build
```

### Configuration Files
- `anchor.toml`: Program IDs and network config
- `app/src/utils/constants.ts`: Frontend constants
- `.env`: RPC endpoints and feature flags

### Testing
```bash
# Run Anchor tests
anchor test

# Run frontend tests
cd app && npm test

# Integration tests
npm run test:integration
```

## Conclusion

Wagers.bet demonstrates a complete decentralized prediction market implementation with sophisticated trading mechanics, user-friendly interfaces, and robust smart contract architecture. The platform's dual-token system creates natural price discovery while the automated order matching ensures efficient markets. The recent addition of "Quick Buy" functionality makes the platform accessible to casual users while preserving advanced features for sophisticated traders.

The codebase serves as both a functional prediction market and a reference implementation for building complex DeFi applications on Solana, showcasing patterns for token management, order books, and atomic operations.