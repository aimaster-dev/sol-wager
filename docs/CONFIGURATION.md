# Configuration Guide

This guide covers all configuration options for iPredict XYZ.

## Environment Variables

### Frontend Configuration

The frontend uses environment variables prefixed with `NEXT_PUBLIC_` to make them available in the browser.

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_RPC_ENDPOINT` | Solana RPC endpoint URL | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_PROGRAM_ID` | Deployed program ID | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` |
| `NEXT_PUBLIC_NETWORK` | Network name | `localnet`, `devnet`, `mainnet-beta` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_RPC_ENDPOINT_BACKUP` | Backup RPC endpoint | None |
| `NEXT_PUBLIC_COMMITMENT_LEVEL` | Transaction commitment level | `confirmed` |
| `NEXT_PUBLIC_API_TIMEOUT` | API request timeout (ms) | `30000` |
| `NEXT_PUBLIC_MAX_RETRIES` | Max retry attempts | `3` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics tracking | `false` |
| `NEXT_PUBLIC_ENABLE_DEBUG_MODE` | Enable debug logging | `false` |

### SDK Configuration

The SDK reads configuration from `sdk/src/constants.ts`:

```typescript
// Program ID (update after deployment)
export const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

// Token configuration
export const TOKENS_PER_SOL = 100;
export const LAMPORTS_PER_TOKEN = 10_000_000; // 0.01 SOL

// Fee configuration
export const PLATFORM_FEE_BPS = 25; // 0.25%
export const DEPLOYER_FEE_BPS = 25; // 0.25%
export const TOTAL_FEE_BPS = 50; // 0.5%
export const WAGER_CREATION_FEE = 1_000_000_000; // 1 SOL

// Limits
export const MAX_NAME_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_ORDERS_PER_BOOK = 1000;
```

### Program Configuration

The Rust program configuration is in `programs/ipredict-xyz/src/constants.rs`:

```rust
pub const PLATFORM_SEED: &[u8] = b"platform";
pub const WAGER_SEED: &[u8] = b"wager";
pub const VAULT_SEED: &[u8] = b"vault";
pub const ORDER_BOOK_SEED: &[u8] = b"order_book";
pub const USER_POSITION_SEED: &[u8] = b"user_position";

pub const TOKENS_PER_SOL: u64 = 100;
pub const LAMPORTS_PER_TOKEN: u64 = 10_000_000;
pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

pub const PLATFORM_FEE_BPS: u16 = 25;
pub const DEPLOYER_FEE_BPS: u16 = 25;
pub const TOTAL_FEE_BPS: u16 = 50;
pub const BPS_DIVISOR: u64 = 10_000;

pub const MAX_NAME_LENGTH: usize = 200;
pub const MAX_DESCRIPTION_LENGTH: usize = 1000;
pub const MAX_ORDERS_PER_BOOK: usize = 1000;

pub const WAGER_CREATION_FEE: u64 = 1_000_000_000;
```

## Network Configuration

### Localnet

```bash
# .env.local
NEXT_PUBLIC_RPC_ENDPOINT=http://localhost:8899
NEXT_PUBLIC_NETWORK=localnet
```

### Devnet

```bash
# .env.development
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

### Mainnet

```bash
# .env.production
NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_NETWORK=mainnet-beta
```

## Anchor Configuration

The `Anchor.toml` file configures the Anchor framework:

```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
ipredict_xyz = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[programs.devnet]
ipredict_xyz = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

## Build Configuration

### Program Build Options

In `Cargo.toml`:

```toml
[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1

[profile.release.build-override]
opt-level = 3
incremental = false
codegen-units = 1
```

### Frontend Build Options

In `next.config.js`:

```javascript
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    // Runtime environment variables
  },
  webpack: (config) => {
    // Webpack customization
    return config;
  },
};
```

## Security Configuration

### Content Security Policy

For production, add CSP headers:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
```

### CORS Configuration

For API endpoints:

```javascript
// pages/api/[...].js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Handle request
}
```

## Performance Configuration

### RPC Optimization

Use multiple RPC endpoints for load balancing:

```typescript
const endpoints = [
  process.env.NEXT_PUBLIC_RPC_ENDPOINT,
  process.env.NEXT_PUBLIC_RPC_ENDPOINT_BACKUP,
].filter(Boolean);

const connection = new Connection(endpoints[0], {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});
```

### Caching

Implement caching for frequently accessed data:

```typescript
// utils/cache.ts
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class Cache<T> {
  private data: Map<string, { value: T; timestamp: number }> = new Map();

  set(key: string, value: T) {
    this.data.set(key, { value, timestamp: Date.now() });
  }

  get(key: string): T | null {
    const item = this.data.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      this.data.delete(key);
      return null;
    }
    
    return item.value;
  }
}
```

## Monitoring Configuration

### Error Tracking

Integrate Sentry for error tracking:

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_NETWORK,
  tracesSampleRate: 1.0,
});
```

### Analytics

Add analytics tracking:

```typescript
// utils/analytics.ts
export const trackEvent = (eventName: string, properties?: any) => {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
    // Google Analytics, Mixpanel, etc.
    window.gtag?.('event', eventName, properties);
  }
};
```

## Development Tools

### Debug Mode

Enable debug logging:

```typescript
export const debug = (...args: any[]) => {
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_MODE === 'true') {
    console.log('[DEBUG]', ...args);
  }
};
```

### Mock Wallet

For development without wallet:

```typescript
const mockWallet = process.env.NEXT_PUBLIC_MOCK_WALLET === 'true' ? {
  publicKey: new PublicKey('11111111111111111111111111111111'),
  signTransaction: async (tx: Transaction) => tx,
  signAllTransactions: async (txs: Transaction[]) => txs,
} : null;
```

## Best Practices

1. **Environment Files**
   - Never commit `.env.local` or `.env.production`
   - Always use `.env.example` as template
   - Document all variables

2. **Secrets Management**
   - Use environment variables for secrets
   - Rotate keys regularly
   - Use different keys per environment

3. **Configuration Validation**
   - Validate all environment variables on startup
   - Provide helpful error messages
   - Set reasonable defaults

4. **Version Control**
   - Tag releases with configuration changes
   - Document breaking changes
   - Maintain backwards compatibility

## Troubleshooting

### Missing Environment Variables

```typescript
// utils/config.ts
export const validateConfig = () => {
  const required = [
    'NEXT_PUBLIC_RPC_ENDPOINT',
    'NEXT_PUBLIC_PROGRAM_ID',
    'NEXT_PUBLIC_NETWORK',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

### Invalid Configuration

Common issues:
- Wrong network in RPC endpoint
- Mismatched program ID
- Invalid wallet path
- Incorrect fee values

Always verify configuration matches deployment network.