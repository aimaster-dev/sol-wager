# iPredict XYZ - Decentralized Prediction Markets

iPredict XYZ is a fully decentralized prediction market platform built on the Solana blockchain. It enables users to create and trade markets on real-world event outcomes using a dual-token system (YES/NO). iPredict XYZ uses on-chain order books and smart contracts to ensure transparent, permissionless, and low-fee trading.

## 🚀 Features

* **Permissionless Market Creation** – Anyone can create markets on any topic
* **YES/NO Token System** – Markets mint tradable outcome tokens
* **On-Chain Order Book** – Fully decentralized order matching
* **Quick Buy** – Simple market orders with slippage protection
* **Instant Settlement** – Claim SOL immediately after resolution
* **Low Fees** – Just 0.5% trading fees

## 📁 Project Structure

```
sol-wager/
├── programs/           # Solana smart contracts (Rust/Anchor)
│   └── ipredict-xyz/   # Main program
├── sdk/                # TypeScript SDK
├── frontend/           # Next.js web app
├── scripts/            # Deployment and utility scripts
└── docs/               # Documentation
```

## 🛠️ Prerequisites

* Node.js 18+
* Rust & Cargo
* Solana CLI
* Anchor (v0.30.1)
* A Solana wallet with SOL

## 🧱 Installation

```bash
git clone https://github.com/your-repo/sol-wager.git
cd sol-wager
npm run install:all
npm run build
```

## 🚀 Deployment

### Localnet

```bash
npm run deploy:localnet
npm run init:platform -- --network localnet
npm run dev
```

### Devnet

```bash
solana airdrop 2 --url devnet
npm run deploy:devnet
```

### Mainnet ⚠️

```bash
npm run deploy:mainnet
```

## 📖 How It Works

### Creating a Market

* Pay 1 SOL to create a market
* Define question, description, and timeline
* YES/NO token mints are created

### Trading

* Deposit SOL to mint YES/NO tokens (equal amounts)
* Trade tokens via order book or Quick Buy
* Prices reflect market sentiment

### Resolution

* Platform authority resolves markets
* Winning token holders claim 0.01 SOL/token
* Losing tokens become worthless

## 🧠 Architecture

* **Platform Program** – Config and fees
* **Wager Program** – Market metadata & logic
* **Order Book** – On-chain order engine
* **Token Minting** – SPL YES/NO tokens

## 🔧 Key Instructions

* `initialize_platform`
* `create_wager`
* `deposit_and_mint`
* `place_order`
* `cancel_order`
* `match_orders`
* `quick_buy`
* `resolve_wager`
* `claim_winnings`

## 💻 SDK Usage

```ts
import { IpredictClient } from '@ipredict-xyz/sdk';

const client = new IpredictClient(connection, wallet);
const tx = await client.createWager({
  name: "Will Bitcoin reach $100k?",
  description: "YES if BTC hits $100,000",
  openingTime: ..., closingTime: ..., resolutionTime: ...
});
```

## 🎨 Frontend

* Wallet integration (Phantom, Solflare)
* Market creation UI
* Order book display
* Portfolio tracking

## 🔒 Security Notes

* Funds held in program-controlled vaults
* Atomic on-chain matching
* Pending: Emergency pause, admin dispute handling, audit

## 💸 Fees

* Market Creation: 1 SOL
* Trading Fee: 0.5%

  * 0.25% to platform
  * 0.25% to deployer
* Token Rate: 100 tokens/SOL (0.01 SOL/token)

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a PR

## 📜 License

MIT License — see LICENSE file.

## 🔗 Links

* Website: [ipredict.xyz](https://ipredict.xyz)
* Docs: [docs.ipredict.xyz](https://docs.ipredict.xyz)
* Twitter: [@ipredictxyz](https://twitter.com/ipredictxyz)
* Discord: [Join our community](https://discord.gg/ipredictxyz)

## ⚠️ Disclaimer

This software is experimental and unaudited. Users must comply with local laws and regulations concerning prediction markets.

---

Built with ❤️ using Anchor, Solana Web3.js, Next.js, and Tailwind CSS.
