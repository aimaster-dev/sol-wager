# iPredict XYZ - Decentralized Prediction Markets

iPredict XYZ is a fully decentralized prediction market platform built on Solana. It allows anyone to create and trade on the outcomes of future events through a unique dual-token system.

## 🚀 Features

- **Permissionless Market Creation**: Any user can create prediction markets on any topic
- **Dual-Token System**: Each market creates YES and NO tokens representing different outcomes
- **On-Chain Order Book**: Fully decentralized order matching and price discovery
- **Quick Buy**: Simplified market orders for easy position taking
- **Instant Settlement**: Winners claim SOL immediately after resolution
- **Low Fees**: Only 0.5% trading fees, powered by Solana's efficiency

## 📁 Project Structure

```
ipredict-xyz/
├── programs/           # Solana smart contracts (Rust/Anchor)
│   └── ipredict-xyz/   # Main program
├── sdk/                # TypeScript SDK
├── frontend/           # Next.js web application
├── scripts/            # Deployment and utility scripts
└── docs/               # Additional documentation
```

## 🛠️ Prerequisites

- Node.js 18+ and npm
- Rust and Cargo
- Solana CLI tools
- Anchor framework (v0.30.1)
- A Solana wallet with SOL for deployment

## 🏗️ Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/ipredict-xyz.git
cd ipredict-xyz
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Build the project:
```bash
npm run build
```

## 🚀 Deployment

### Local Development

1. Start a local Solana validator:
```bash
npm run deploy:localnet
```

2. Initialize the platform:
```bash
npm run init:platform -- --network localnet
```

3. Start the frontend:
```bash
npm run dev
```

### Devnet Deployment

1. Ensure you have Devnet SOL:
```bash
solana airdrop 2 --url devnet
```

2. Deploy to Devnet:
```bash
npm run deploy:devnet
```

### Mainnet Deployment

⚠️ **Warning**: Mainnet deployment requires real SOL. Ensure you have thoroughly tested on Devnet first.

```bash
npm run deploy:mainnet
```

## 🧪 Testing

⚠️ **Note**: Test suite is not yet implemented. Coming soon.

Test wager creation manually:
```bash
npm run test:wager -- --network localnet
```

## 📖 How It Works

### Creating a Market

1. Users pay 1 SOL to create a new prediction market
2. They define the question, description, and timeline
3. The system creates YES and NO token mints
4. Market becomes active at the specified opening time

### Trading

1. Users deposit SOL to mint equal amounts of YES and NO tokens
2. They can trade these tokens on the order book
3. Prices reflect the market's belief in the outcome probability
4. Quick Buy allows instant market orders

### Resolution

1. Platform authority resolves markets based on real-world outcomes
2. Winning token holders can claim 0.01 SOL per token
3. Losing tokens become worthless

## 🏗️ Architecture

### Smart Contracts

- **Platform**: Global configuration and fee management
- **Wager**: Individual market logic and metadata
- **Order Book**: Decentralized order matching engine
- **Token System**: SPL token mints for YES/NO tokens

### Key Instructions

- `initialize_platform`: One-time platform setup
- `create_wager`: Create a new prediction market
- `deposit_and_mint`: Deposit SOL and receive equal YES/NO tokens
- `place_order`: Place buy/sell orders (sell orders use escrow)
- `cancel_order`: Cancel open orders and return escrowed tokens
- `match_orders`: Execute matching orders (called by anyone)
- `quick_buy`: Market buy with slippage protection
- `resolve_wager`: Resolve market outcome (YesWon/NoWon/Draw)
- `claim_winnings`: Burn winning tokens and claim SOL

## 💻 SDK Usage

```typescript
import { IpredictClient } from '@ipredict-xyz/sdk';
import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

// Initialize client
const connection = new Connection('https://api.devnet.solana.com');
const wallet = new Wallet(keypair);
const client = new IpredictClient(connection, wallet);

// Create a wager
const tx = await client.createWager({
  name: "Will Bitcoin reach $100k?",
  description: "Resolves YES if BTC hits $100,000",
  openingTime: new BN(Date.now() / 1000),
  closingTime: new BN(Date.now() / 1000 + 86400 * 30),
  resolutionTime: new BN(Date.now() / 1000 + 86400 * 31),
});
```

## 🎨 Frontend Features

- Wallet integration (Phantom, Solflare, etc.)
- Real-time market data
- Order book visualization
- Basic portfolio tracking
- Market creation interface

## 🔒 Security Considerations

- All funds are held in program-controlled vaults
- Order matching happens atomically on-chain
- Open source and auditable

⚠️ **Important**: This platform has not been audited. The following security features are pending:
- Emergency pause mechanism
- Admin controls for dispute resolution
- Upgrade authority management

## 📊 Fee Structure

- Market Creation: 1 SOL (one-time)
- Trading Fees: 0.5% total
  - 0.25% to platform (platform fee recipient)
  - 0.25% to deployer (deployer fee recipient)
- No deposit/withdrawal fees
- No maintenance fees
- Token pricing: 100 tokens per SOL (0.01 SOL per token)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- Website: [ipredict.xyz](https://ipredict.xyz)
- Documentation: [docs.ipredict.xyz](https://docs.ipredict.xyz)
- Twitter: [@ipredictxyz](https://twitter.com/ipredictxyz)
- Discord: [Join our community](https://discord.gg/ipredictxyz)

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Prediction markets may be regulated differently in various jurisdictions. Users are responsible for complying with local laws and regulations.

## 🙏 Acknowledgments

Built with:
- [Anchor Framework](https://anchor-lang.com)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js)
- [Next.js](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)