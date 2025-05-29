# iPredict XYZ API Documentation

## SDK Client

### Installation

```bash
npm install @ipredict-xyz/sdk
```

### Initialization

```typescript
import { IpredictClient } from '@ipredict-xyz/sdk';
import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

const connection = new Connection('https://api.devnet.solana.com');
const wallet = new Wallet(keypair);
const client = new IpredictClient(connection, wallet);
```

## Core Methods

### Platform Management

#### `initializePlatform()`
Initialize the platform (one-time setup).

```typescript
const txId = await client.initializePlatform();
```

#### `getPlatform()`
Get platform configuration.

```typescript
const platform = await client.getPlatform();
// Returns: Platform | null
```

### Wager Management

#### `createWager(params)`
Create a new prediction market.

```typescript
const txId = await client.createWager({
  name: "Will Bitcoin reach $100k?",
  description: "Detailed resolution criteria...",
  openingTime: new BN(Date.now() / 1000),
  closingTime: new BN(Date.now() / 1000 + 86400 * 30),
  resolutionTime: new BN(Date.now() / 1000 + 86400 * 31),
});
```

Parameters:
- `name`: string (max 200 chars)
- `description`: string (max 1000 chars)
- `openingTime`: BN (unix timestamp)
- `closingTime`: BN (unix timestamp)
- `resolutionTime`: BN (unix timestamp)

#### `getWager(wagerId)`
Get wager details.

```typescript
const wager = await client.getWager(new BN(1));
// Returns: Wager | null
```

#### `getAllWagers()`
Get all wagers.

```typescript
const wagers = await client.getAllWagers();
// Returns: Wager[]
```

#### `getActiveWagers()`
Get only active wagers.

```typescript
const activeWagers = await client.getActiveWagers();
// Returns: Wager[]
```

#### `getUserWagers(creator)`
Get wagers created by a specific user.

```typescript
const userWagers = await client.getUserWagers(creatorPublicKey);
// Returns: Wager[]
```

### Token Operations

#### `depositAndMint(wagerId, amount)`
Deposit SOL and mint equal amounts of YES and NO tokens.

```typescript
const txId = await client.depositAndMint(
  new BN(1), // wagerId
  new BN(LAMPORTS_PER_SOL) // 1 SOL = 100 YES + 100 NO tokens
);
```

### Trading

#### `placeOrder(params)`
Place a buy or sell order. Sell orders transfer tokens to escrow.

```typescript
const txId = await client.placeOrder({
  wagerId: new BN(1),
  side: OrderSide.Buy,
  tokenType: TokenType.Yes,
  price: new BN(5_000_000), // 0.005 SOL per token
  quantity: new BN(100), // 100 tokens
});
```

Parameters:
- `wagerId`: BN
- `side`: OrderSide (Buy | Sell)
- `tokenType`: TokenType (Yes | No)
- `price`: BN (in lamports per token, max 10_000_000)
- `quantity`: BN (number of tokens)

#### `cancelOrder(wagerId, orderId)`
Cancel an existing order. Returns escrowed tokens for sell orders.

```typescript
const txId = await client.cancelOrder(
  new BN(1), // wagerId
  new BN(123) // orderId
);
```

#### `matchOrders(wagerId, maxIterations?)`
Execute matching orders in the order book. Can be called by anyone.

```typescript
const txId = await client.matchOrders(
  new BN(1), // wagerId
  10 // max iterations (default: 10)
);
```

#### `quickBuy(params)`
Execute a market buy order with slippage protection.

```typescript
const txId = await client.quickBuy({
  wagerId: new BN(1),
  tokenType: TokenType.Yes,
  solAmount: new BN(LAMPORTS_PER_SOL), // 1 SOL
  minTokensOut: new BN(90), // Slippage protection
});
```

### Resolution & Claims

#### `resolveWager(wagerId, resolution)`
Resolve a wager (platform authority only).

```typescript
const txId = await client.resolveWager(
  new BN(1),
  Resolution.YesWon
);
```

Resolution options:
- `Resolution.YesWon` - YES tokens win
- `Resolution.NoWon` - NO tokens win  
- `Resolution.Draw` - Both tokens get half value

#### `claimWinnings(wagerId)`
Burn winning tokens and claim SOL after resolution.

```typescript
const txId = await client.claimWinnings(new BN(1));
```

### Data Queries

#### `getOrderBook(wagerId)`
Get order book for a wager.

```typescript
const orderBook = await client.getOrderBook(new BN(1));
// Returns: OrderBook | null
```

#### `getUserPosition(wagerId, user?)`
Get user's position in a wager.

```typescript
const position = await client.getUserPosition(
  new BN(1),
  userPublicKey // optional, defaults to wallet
);
// Returns: UserPosition | null
```

## Types

### Enums

```typescript
enum WagerStatus {
  Created = 'Created',
  Active = 'Active',
  Resolved = 'Resolved',
}

enum Resolution {
  Pending = 'Pending',
  YesWon = 'YesWon',
  NoWon = 'NoWon',
  Draw = 'Draw',
}

enum TokenType {
  Yes = 'Yes',
  No = 'No',
}

enum OrderSide {
  Buy = 'Buy',
  Sell = 'Sell',
}
```

### Interfaces

```typescript
interface Wager {
  creator: PublicKey;
  name: string;
  description: string;
  yesMint: PublicKey;
  noMint: PublicKey;
  vault: PublicKey;
  orderBook: PublicKey;
  openingTime: BN;
  closingTime: BN;
  resolutionTime: BN;
  status: WagerStatus;
  resolution: Resolution;
  totalYesTokens: BN;
  totalNoTokens: BN;
  totalSolDeposited: BN;
  totalVolumeTraded: BN;
  totalFeesCollected: BN;
  wagerId: BN;
  bump: number;
}

interface Order {
  id: BN;
  owner: PublicKey;
  side: OrderSide;
  tokenType: TokenType;
  price: BN;
  quantity: BN;
  filledQuantity: BN;
  timestamp: BN;
}

interface OrderBook {
  wager: PublicKey;
  nextOrderId: BN;
  buyOrdersYes: Order[];
  sellOrdersYes: Order[];
  buyOrdersNo: Order[];
  sellOrdersNo: Order[];
  bump: number;
}

interface UserPosition {
  user: PublicKey;
  wager: PublicKey;
  yesTokensBought: BN;
  yesTokensSold: BN;
  noTokensBought: BN;
  noTokensSold: BN;
  totalSolDeposited: BN;
  totalSolWithdrawn: BN;
  winningsClaimed: boolean;
  bump: number;
}

interface Platform {
  authority: PublicKey;
  feeRecipient: PublicKey;
  deployerFeeRecipient: PublicKey;
  wagerCreationFee: BN;
  platformFeeBps: number;
  deployerFeeBps: number;
  totalWagersCreated: BN;
  totalVolumeTraded: BN;
  totalFeesCollected: BN;
  bump: number;
}
```

## Utility Functions

### PDA Derivation

```typescript
import { 
  getPlatformPDA,
  getWagerPDA,
  getVaultPDA,
  getOrderBookPDA,
  getUserPositionPDA,
  getYesMintPDA,
  getNoMintPDA,
  getEscrowPDA
} from '@ipredict-xyz/sdk';

const [platformPDA, bump] = getPlatformPDA();
const [wagerPDA, bump] = getWagerPDA(wagerId);
const [vaultPDA, bump] = getVaultPDA(wagerId);
const [escrowPDA, bump] = getEscrowPDA(wagerId, TokenType.Yes);
```

### Constants

```typescript
import { 
  PROGRAM_ID,
  TOKENS_PER_SOL,
  LAMPORTS_PER_TOKEN,
  PLATFORM_FEE_BPS,
  DEPLOYER_FEE_BPS,
  TOTAL_FEE_BPS,
  WAGER_CREATION_FEE
} from '@ipredict-xyz/sdk';

// TOKENS_PER_SOL = 100
// LAMPORTS_PER_TOKEN = 10_000_000 (0.01 SOL)
// PLATFORM_FEE_BPS = 25 (0.25%)
// DEPLOYER_FEE_BPS = 25 (0.25%)
// TOTAL_FEE_BPS = 50 (0.5%)
// WAGER_CREATION_FEE = 1_000_000_000 (1 SOL)
```

## Error Handling

```typescript
try {
  const txId = await client.createWager(params);
} catch (error) {
  if (error.message.includes('InvalidTimeParameters')) {
    console.error('Invalid time parameters provided');
  } else if (error.message.includes('InsufficientBalance')) {
    console.error('Insufficient SOL balance');
  }
  // Handle other errors...
}
```

Common errors:
- `InvalidTimeParameters`: Time values are invalid
- `WagerNotOpen`: Market is not open for trading
- `WagerClosed`: Market has closed
- `WagerAlreadyResolved`: Market already resolved
- `WagerNotResolvable`: Too early to resolve
- `InvalidResolution`: Invalid resolution value
- `InvalidOrderPrice`: Price outside valid range
- `InvalidOrderQuantity`: Quantity is zero
- `OrderBookFull`: Too many orders
- `OrderNotFound`: Order ID doesn't exist
- `Unauthorized`: Lacking required permissions
- `InsufficientBalance`: Not enough SOL/tokens
- `SlippageExceeded`: Price moved beyond tolerance
- `InvalidTokenType`: Wrong token type
- `MathOverflow`: Arithmetic overflow

## Transaction Confirmation

All methods return transaction signatures. Always wait for confirmation:

```typescript
import { confirmTransaction } from '@ipredict-xyz/sdk';

const txId = await client.createWager(params);
await confirmTransaction(connection, txId);
```

## Best Practices

1. **Error Handling**: Always wrap SDK calls in try-catch
2. **Confirmation**: Wait for transaction confirmation before proceeding
3. **Validation**: Validate inputs before sending transactions
4. **Price Limits**: Token prices must be between 0 and 0.01 SOL
5. **Time Validation**: Ensure opening < closing < resolution time
6. **Slippage**: Use minTokensOut for quickBuy to protect against price movements
7. **Gas Optimization**: Batch read operations when possible

## Notes

- All amounts are in lamports (1 SOL = 1,000,000,000 lamports)
- Each SOL deposited mints 100 YES and 100 NO tokens
- Winning tokens can be burned for 0.01 SOL each
- Order matching uses price-time priority
- The platform has not been audited - use at your own risk