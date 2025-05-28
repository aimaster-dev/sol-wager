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

Install dependencies

bash# Install Rust dependencies
cargo build

# Install JavaScript dependencies
cd app
npm install
Deployment
Deploy Solana Program

Start local Solana validator (for development)

bashsolana-test-validator

Build and deploy using Anchor

bashanchor build
anchor deploy

Update the program ID in your code

bash# Get the program ID
solana address -k target/deploy/general_wager_bet-keypair.json

# Update the ID in lib.rs and Anchor.toml
Deploy Frontend

Start the development server

bashcd app
npm start

For production deployment

bashnpm run build
# Deploy the build folder to your hosting service