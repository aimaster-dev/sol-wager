# General Wager Bet - Decentralized Betting Platform on Solana

General Wager Bet is a fully decentralized betting platform built on the Solana blockchain that allows the community to launch proposition wagers and trade YES/NO tokens through a pooled orderbook system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Development Roadmap](#development-roadmap)
- [Technical Considerations](#technical-considerations)

## Overview

General Wager Bet enables users to create and participate in proposition wagers without relying on centralized betting platforms. When a user deposits SOL, they receive an equal number of YES and NO tokens. Trading these tokens on the built-in orderbook creates dynamic odds based on market demand. When a wager is resolved, token holders of the winning proposition can redeem their tokens for SOL.

## Architecture

The platform consists of the following components:

### Smart Contracts (Solana Programs)

1. **Platform**
   - Manages global settings and fees
   - Tracks all created wagers

2. **Wager**
   - Individual betting propositions
   - Manages token minting, deposits, and resolution
   - Handles SOL vault for payouts

3. **OrderBook**
   - Decentralized pooled order matching
   - Supports partial filling of orders
   - Tracks active orders and history

4. **Tokens**
   - SPL tokens for YES and NO propositions
   - Redeemable for SOL after resolution

### Frontend

- React-based web interface
- Integrates with Solana wallets (Phantom, Solflare, etc.)
- Real-time order book and price charts

## Project Structure

```
general-wager-bet/
├── programs/           # Solana programs (Rust)
│   └── general-wager-bet/
│       ├── src/
│       │   ├── lib.rs    # Main program code
│       │   └── errors.rs # Custom errors
│       └── Cargo.toml
├── app/                # Frontend application (React/TypeScript)
│   ├── public/
│   └── src/
│       ├── components/   # React components
│       ├── client/       # Solana client interface
│       └── App.tsx
├── tests/              # Integration tests
└── Anchor.toml         # Anchor configuration
```

## Key Features

### Decentralized Orderbook

- Buy and sell orders go into a pool with price metadata
- Orders can be partially or completely filled
- 0.5% trading fee on matched orders

### Betting Propositions

- Community-deployed betting propositions
- Time-bound opening and conclusion periods
- Clear resolution criteria

### Token System

- 1 SOL deposit yields 100 YES and 100 NO tokens
- Winning tokens redeemable for 0.01 SOL each
- Losing tokens have no redemption value
- In case of a draw, all tokens can be redeemed for half their face value

### Resolution Mechanism

Currently, the platform authority (deployer) resolves wagers. Future versions will support:
- Validator consensus mechanisms
- AI-powered automated resolutions
- DAO-based governance

## Getting Started

### Prerequisites

- Rust 1.65+ and Solana CLI tools
- Node.js 16+ and npm/yarn
- Anchor Framework 0.28+
- Solana wallet (e.g., Phantom, Solflare)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/general-wager-bet.git
cd general-wager-bet
```

2. Install dependencies
```bash
# Install Rust dependencies
cargo build

# Install JavaScript dependencies
cd app
npm install
```

## Deployment

### Deploy Solana Program

1. Start local Solana validator (for development)
```bash
solana-test-validator
```

2. Build and deploy using Anchor
```bash
anchor build
anchor deploy
```

3. Update the program ID in your code
```bash
# Get the program ID
solana address -k target/deploy/general_wager_bet-keypair.json

# Update the ID in lib.rs and Anchor.toml
```

### Deploy Frontend

1. Start the development server
```bash
cd app
npm start
```

2. For production deployment
```bash
npm run build
# Deploy the build folder to your hosting service
```

## Usage Guide

### Creating a Wager

1. Connect your wallet
2. Navigate to "Create Wager" tab
3. Fill in the proposition details:
   - Name and description
   - Opening and conclusion times
   - Resolution criteria
4. Pay the 1 SOL deployment fee
5. Your proposition is now live!

### Depositing SOL

1. Navigate to a wager's details page
2. Enter the amount of SOL to deposit
3. Confirm the transaction
4. You'll receive 100 YES and 100 NO tokens per 1 SOL deposited

### Trading Tokens

1. Navigate to a wager's details page
2. Select buy/sell, YES/NO token
3. Enter price and quantity
4. Submit the order
5. Orders will be matched against the pool, with partial filling supported

### Claiming Winnings

1. After a wager is resolved, navigate to the wager's details page
2. Click "Claim Winnings"
3. Winning tokens will be redeemed for 0.01 SOL each

## Development Roadmap

### Phase 1: MVP (Current)
- Basic platform with proposition creation
- Decentralized orderbook with partial fills
- Platform authority resolving wagers

### Phase 2: Enhanced Resolution
- Multi-validator consensus mechanism
- Integration with oracles for automated resolution
- Support for more complex proposition types

### Phase 3: Advanced Features
- Liquidity pools and automated market making
- Mobile application
- Advanced analytics and visualization tools
- DAO governance for platform parameters

## Technical Considerations

### Security

- All smart contracts use Anchor's security patterns
- Critical operations require proper authorization
- Funds are secured in PDA-controlled vaults
- Time-bound operations prevent premature resolution

### Scalability

- Leverages Solana's high-throughput blockchain
- Optimized account data structures
- Efficient order matching algorithm
- Pagination for order history and wager listings

### Economic Incentives

- Platform fees fund ongoing development
- Market-driven odds based on order flow
- Equal initial distribution of YES/NO tokens ensures market neutrality

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Solana and Anchor Framework team
- SPL Token program developers
- Open-source decentralized exchange protocols that inspired the orderbook design
