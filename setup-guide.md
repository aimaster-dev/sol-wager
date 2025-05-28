# General Wager Bet - Project Setup Guide

This guide will help you set up and run the General Wager Bet decentralized betting platform on Solana.

## Prerequisites

Before starting, ensure you have the following installed:

- Node.js (v16+)
- Yarn or npm
- Rust (latest stable)
- Solana CLI tools (v1.10+)
- Anchor Framework (0.28+)
- Solana wallet with devnet SOL

## Setting Up the Project

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/general-wager-bet.git
cd general-wager-bet
```

### 2. Install Dependencies

```bash
# Install Rust dependencies
cargo build

# Install JavaScript dependencies
npm install
```

### 3. Configure Solana

```bash
# Set Solana to devnet
solana config set --url devnet

# Generate a new wallet (if you don't have one)
solana-keygen new

# Airdrop some devnet SOL
solana airdrop 2
```

## Building and Deploying

### 1. Build the Solana Program

```bash
anchor build
```

### 2. Deploy to Devnet

```bash
# Run the deployment script
ts-node migrations/deploy.ts devnet
```

This script will:
- Build the program
- Update the program ID in all necessary files
- Deploy the program to devnet

### 3. Start the Frontend Application

```bash
# Run the React app
npm start
```

The application will be available at http://localhost:3000

## Using the Platform

### Initializing the Platform

1. Connect your wallet using the button in the top right
2. Click "Initialize Platform" if this is a fresh deployment
3. Wait for the transaction to confirm

### Creating a Wager

1. Navigate to the "Create Wager" tab
2. Fill in the wager details:
   - Name and description
   - Opening and conclusion times
   - Resolution criteria
3. Click "Create Wager"
4. Confirm the transaction in your wallet

### Depositing SOL

1. Navigate to a wager's details page
2. Enter the amount of SOL to deposit
3. Click "Deposit"
4. Confirm the transaction
5. You'll receive 100 YES and 100 NO tokens per 1 SOL deposited

### Trading Tokens

1. Navigate to a wager's details page
2. Use the "Place Order" form:
   - Select Buy/Sell
   - Select YES/NO token
   - Enter price and quantity
3. Click "Place Order"
4. Confirm the transaction
5. Your order will be added to the orderbook and may be matched with existing orders

### Resolving Wagers

1. Navigate to a wager's details page after the conclusion time
2. If you're the platform authority, you'll see the "Resolve Wager" section
3. Click on the appropriate resolution (YES Won, NO Won, or Draw)
4. Confirm the transaction

### Claiming Winnings

1. Navigate to a wager's details page after it has been resolved
2. If you have winning tokens, you'll see the "Claim Winnings" button
3. Click the button and confirm the transaction
4. Your tokens will be burned and you'll receive SOL in return

## Development

### Running Tests

```bash
anchor test
```

### Updating the Program

If you make changes to the Solana program:

1. Update the code in `programs/general-wager-bet/src/`
2. Run `anchor build`
3. Deploy with `anchor deploy --provider.cluster devnet`

### Updating the Frontend

The React application is in the `src/` directory. After making changes:

1. Test locally with `npm start`
2. Build for production with `npm run build`

## Project Structure

- `programs/general-wager-bet/src/` - Solana program code
- `src/` - React frontend code
- `src/components/` - React components
- `src/client/` - Client code for interacting with the Solana program
- `src/utils/` - Utility functions and constants
- `tests/` - Integration tests
- `migrations/` - Deployment scripts

## Troubleshooting

### Common Issues

1. **Transaction Error: Failed to initialize platform**
   - Ensure your wallet has enough SOL
   - Check that you're using the correct network (devnet)

2. **Missing Anchor-generated Files**
   - Run `anchor build` and then check the `target/` directory

3. **Order Matching Not Working**
   - Check that the order books are properly initialized
   - Verify the price and token type for your orders

4. **Token Account Errors**
   - The client should automatically create token accounts, but if you encounter issues, you may need to manually create associated token accounts

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

---

Happy betting on the General Wager Bet platform!
