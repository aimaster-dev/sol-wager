# Wagers.bet API Documentation

## Overview

This document describes the client-side API for interacting with the Wagers.bet Solana program. All methods are available through the `WagerBetClient` class.

## Installation

```typescript
import { WagerBetClient } from './client/general-wager-bet-client';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@project-serum/anchor';

// Initialize connection
const connection = new Connection('https://api.devnet.solana.com');
const wallet = new Wallet(keypair);
const programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

// Create client instance
const client = new WagerBetClient(wallet, connection, programId);
```

## Platform Methods

### initializePlatform()
Initializes the betting platform (one-time setup by deployer).

```typescript
const txId = await client.initializePlatform();
```

**Returns:** Transaction signature
**Permissions:** Platform deployer only

## Wager Management

### createWager()
Creates a new prediction market wager.

```typescript
const result = await client.createWager(
  name: string,              // Wager title
  description: string,       // Detailed description
  openingTime: number,       // Unix timestamp when betting opens
  conclusionTime: number,    // Unix timestamp when event concludes
  conclusionDetails: string  // How the wager will be resolved
);
```

**Returns:**
```typescript
{
  txSignature: string,      // Transaction ID
  wagerPDA: PublicKey,      // Wager account address
  yesMintPDA: PublicKey,    // YES token mint
  noMintPDA: PublicKey      // NO token mint
}
```

### getWagerDetails()
Retrieves details for a specific wager.

```typescript
const details = await client.getWagerDetails(wagerPDA: PublicKey);
```

**Returns:** Wager account data including status, resolution, and token mints

### getAllWagers()
Fetches all active wagers on the platform.

```typescript
const wagers = await client.getAllWagers();
```

**Returns:** Array of wager accounts with their public keys

## Trading Methods

### depositSol()
Deposits SOL to receive both YES and NO tokens.

```typescript
const txId = await client.depositSol(
  wagerPDA: PublicKey,      // Wager to deposit into
  yesMintPDA: PublicKey,    // YES token mint
  noMintPDA: PublicKey,     // NO token mint
  amount: number            // SOL amount (not lamports)
);
```

**Returns:** Transaction signature
**Note:** User receives 100 YES + 100 NO tokens per SOL

### buyPosition() [NEW]
Simplified one-click position buying.

```typescript
const txId = await client.buyPosition(
  wagerPDA: PublicKey,      // Wager to trade on
  isYesToken: boolean,      // true for YES, false for NO
  solAmount: number         // SOL to spend
);
```

**Returns:** Transaction signature
**Process:** 
1. Deposits SOL
2. Receives both tokens
3. Automatically sells unwanted tokens

### calculatePositionCost() [NEW]
Calculates the effective cost of buying a position.

```typescript
const cost = await client.calculatePositionCost(
  wagerPDA: PublicKey,
  isYesToken: boolean,
  solAmount: number
);
```

**Returns:**
```typescript
{
  totalCost: number,        // Net SOL cost after selling unwanted tokens
  effectivePrice: number,   // Price per desired token
  tokensReceived: number,   // Amount of desired tokens
  priceImpact: number      // Percentage price impact
}
```

### createOrder()
Places a limit order on the order book.

```typescript
const txId = await client.createOrder(
  wagerPDA: PublicKey,
  orderBookPDA: PublicKey,
  yesMintPDA: PublicKey,
  noMintPDA: PublicKey,
  isBuy: boolean,          // true for buy, false for sell
  isYesToken: boolean,     // true for YES, false for NO
  price: number,           // Price per token in SOL
  quantity: number         // Number of tokens
);
```

**Returns:** Transaction signature

### cancelOrder()
Cancels an active order.

```typescript
const txId = await client.cancelOrder(
  orderPDA: PublicKey,
  orderBookPDA: PublicKey,
  wagerPDA: PublicKey,
  yesMintPDA: PublicKey,
  noMintPDA: PublicKey
);
```

**Returns:** Transaction signature

## Resolution & Claims

### resolveWager()
Resolves a wager with the final outcome.

```typescript
const txId = await client.resolveWager(
  wagerPDA: PublicKey,
  resolution: 0 | 1 | 2    // 0 = YES won, 1 = NO won, 2 = Draw
);
```

**Returns:** Transaction signature
**Permissions:** Platform authority only

### claimWinnings()
Claims SOL payout for winning tokens.

```typescript
const txId = await client.claimWinnings(
  wagerPDA: PublicKey,
  yesMintPDA: PublicKey,
  noMintPDA: PublicKey
);
```

**Returns:** Transaction signature
**Payout:** 0.01 SOL per winning token

## Query Methods

### getOrderBookPDA()
Derives the order book address for a wager.

```typescript
const orderBookPDA = await client.getOrderBookPDA(wagerPDA: PublicKey);
```

### getOrdersForWager()
Fetches all orders for a specific wager.

```typescript
const orders = await client.getOrdersForWager(wagerPDA: PublicKey);
```

**Returns:** Array of order accounts

### getUserTokenBalances()
Gets user's YES and NO token balances.

```typescript
const balances = await client.getUserTokenBalances(
  userPDA: PublicKey,
  yesMintPDA: PublicKey,
  noMintPDA: PublicKey
);
```

**Returns:**
```typescript
{
  yesBalance: number,
  noBalance: number
}
```

## Subscriptions

### subscribeToWagerUpdates()
Subscribe to real-time wager updates.

```typescript
const subscriptionId = client.subscribeToWagerUpdates(
  wagerPDA: PublicKey,
  callback: (wagerAccount: any) => void
);
```

### subscribeToOrderBookUpdates()
Subscribe to order book changes.

```typescript
const subscriptionId = client.subscribeToOrderBookUpdates(
  orderBookPDA: PublicKey,
  callback: (orderBookAccount: any) => void
);
```

### unsubscribe()
Cancel a subscription.

```typescript
client.unsubscribe(subscriptionId: number);
```

## Error Handling

All methods may throw errors with the following types:

- `WagerNotActive`: Attempting to trade on inactive wager
- `InsufficientBalance`: Not enough tokens or SOL
- `InvalidResolution`: Invalid resolution value
- `Unauthorized`: Missing required permissions
- `InsufficientFunds`: Vault has insufficient SOL

Example error handling:

```typescript
try {
  await client.buyPosition(wagerPDA, true, 1.0);
} catch (error) {
  if (error.message.includes('WagerNotActive')) {
    console.error('This wager is not accepting trades');
  } else if (error.message.includes('InsufficientBalance')) {
    console.error('Not enough SOL in wallet');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

## Constants

```typescript
// Program ID (Devnet)
export const PROGRAM_ID = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

// Token Decimals
export const TOKEN_DECIMALS = 9;

// Exchange Rate
export const TOKENS_PER_SOL = 100;

// Payout Rate
export const SOL_PER_TOKEN = 0.01;

// Platform Fee
export const TRADING_FEE_BPS = 50; // 0.5%
```