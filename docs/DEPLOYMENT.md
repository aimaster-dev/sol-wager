# Deployment Guide

This guide covers deploying iPredict XYZ to different Solana clusters.

## Prerequisites

1. **Install Dependencies**
   ```bash
   # Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Solana CLI
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   
   # Anchor (v0.30.1)
   cargo install --git https://github.com/coral-xyz/anchor avm --tag v0.30.1 --locked --force
   avm install 0.30.1
   avm use 0.30.1
   
   # Node.js 18+
   # Install from https://nodejs.org
   ```

2. **Create Wallet**
   ```bash
   solana-keygen new --outfile ~/.config/solana/id.json
   ```

3. **Configure Solana CLI**
   ```bash
   # For Devnet
   solana config set --url devnet
   
   # For Mainnet
   solana config set --url mainnet-beta
   ```

## Quick Deploy

### Using the Deploy Script

The project includes an automated deployment script:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to localnet
./scripts/deploy.sh localnet

# Deploy to devnet
./scripts/deploy.sh devnet

# Deploy to mainnet (requires confirmation)
./scripts/deploy.sh mainnet
```

The script handles:
- Building the program
- Starting local validator (localnet only)
- Airdropping SOL (localnet/devnet)
- Deploying program
- Initializing platform

## Manual Deployment

### Local Development

1. **Start Local Validator**
   ```bash
   solana-test-validator
   ```

2. **Build Program**
   ```bash
   cd programs/ipredict-xyz
   anchor build
   ```

3. **Deploy Program**
   ```bash
   anchor deploy --provider.cluster localnet
   ```

4. **Update Program ID**
   
   After first deployment, update the program ID in:
   - `programs/ipredict-xyz/src/lib.rs` (declare_id!)
   - `programs/ipredict-xyz/Anchor.toml`
   - `sdk/src/constants.ts`

5. **Initialize Platform**
   ```bash
   npm run init:platform -- --network localnet
   ```

6. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

### Devnet Deployment

1. **Get Devnet SOL**
   ```bash
   solana airdrop 2
   ```

2. **Build Program**
   ```bash
   cd programs/ipredict-xyz
   anchor build
   ```

3. **Deploy to Devnet**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

4. **Verify Deployment**
   ```bash
   solana program show <PROGRAM_ID>
   ```

5. **Initialize Platform**
   ```bash
   npm run init:platform -- --network devnet
   ```

### Mainnet Deployment

⚠️ **CRITICAL**: Mainnet deployment requires real SOL and should only be done after:
- Comprehensive testing on devnet
- Security audit
- Proper key management setup

#### Pre-Deployment Checklist

- [ ] All tests pass (when implemented)
- [ ] Devnet testing complete
- [ ] Program has been audited
- [ ] Multi-sig wallet prepared for authority
- [ ] Emergency procedures documented
- [ ] Sufficient SOL in deployer wallet (10+ SOL recommended)
- [ ] Environment variables configured
- [ ] Monitoring infrastructure ready

#### Deployment Steps

1. **Verify Wallet Balance**
   ```bash
   solana balance
   solana config get
   ```

2. **Build Program**
   ```bash
   cd programs/ipredict-xyz
   anchor build
   ```

3. **Deploy Program**
   ```bash
   anchor deploy --provider.cluster mainnet
   ```

4. **Initialize Platform**
   ```bash
   npm run init:platform -- --network mainnet
   ```

5. **Transfer Upgrade Authority**
   ```bash
   # Transfer to multi-sig for security
   solana program set-upgrade-authority <PROGRAM_ID> <MULTISIG_ADDRESS>
   ```

## Environment Configuration

### Frontend Environment Variables

Create `.env.local` for development:
```env
NEXT_PUBLIC_RPC_ENDPOINT=http://localhost:8899
NEXT_PUBLIC_PROGRAM_ID=<YOUR_PROGRAM_ID>
NEXT_PUBLIC_NETWORK=localnet
```

Create `.env.production` for production:
```env
NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PROGRAM_ID=<YOUR_PROGRAM_ID>
NEXT_PUBLIC_NETWORK=mainnet-beta
```

### SDK Configuration

Update `sdk/src/constants.ts`:
```typescript
export const PROGRAM_ID = new PublicKey('<YOUR_PROGRAM_ID>');
```

## Frontend Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set Environment Variables**
   
   In Vercel dashboard, add:
   - `NEXT_PUBLIC_RPC_ENDPOINT`
   - `NEXT_PUBLIC_PROGRAM_ID`
   - `NEXT_PUBLIC_NETWORK`

### Self-Hosted

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm run start
   ```

3. **Use Process Manager**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start with PM2
   pm2 start npm --name "ipredict-frontend" -- start
   ```

## Post-Deployment Tasks

### 1. Verify Platform Initialization

```bash
# Check platform account
solana account <PLATFORM_PDA>
```

### 2. Create Test Market

```bash
npm run test:wager -- --network <NETWORK>
```

### 3. Monitor Logs

```bash
# Watch program logs
solana logs <PROGRAM_ID> --url <CLUSTER_URL>
```

### 4. Set Up Monitoring

- Configure alerts for program errors
- Monitor transaction volume
- Track total value locked (TVL)
- Set up uptime monitoring

## Upgrading the Program

⚠️ **Note**: Program upgrades are not possible once upgrade authority is removed or transferred to a burn address.

### Upgrade Process

1. **Test on Devnet First**
   ```bash
   anchor upgrade <PROGRAM_ID> --provider.cluster devnet
   ```

2. **Mainnet Upgrade**
   ```bash
   # Requires upgrade authority
   anchor upgrade <PROGRAM_ID> --provider.cluster mainnet
   ```

## Troubleshooting

### Common Issues

1. **"Insufficient funds for rent"**
   - Ensure wallet has enough SOL
   - Programs require ~1-2 SOL for rent exemption

2. **"Program already exists"**
   - Use `anchor upgrade` instead of `deploy`
   - Or use a different program ID

3. **"Transaction too large"**
   - Reduce transaction size
   - Split into multiple transactions

4. **"Blockhash not found"**
   - Network congestion issue
   - Retry with exponential backoff

### Debug Commands

```bash
# Check program details
solana program show <PROGRAM_ID>

# View recent transactions
solana transaction-history <PROGRAM_ID> --limit 10

# Decode transaction
solana confirm -v <TX_SIGNATURE>

# Check account data
solana account <ACCOUNT_ADDRESS>
```

## Security Considerations

### Key Management

1. **Use Hardware Wallets**
   - Ledger or similar for mainnet deployments
   - Never expose private keys

2. **Multi-Signature Setup**
   - Use Squads Protocol or similar
   - Require multiple signers for critical operations

3. **Backup Procedures**
   - Secure backup of all keys
   - Test recovery procedures

### Operational Security

1. **Access Control**
   - Limit deployment access
   - Use separate keys for different roles
   - Regular access audits

2. **Monitoring**
   - Real-time alerts for anomalies
   - Regular security scans
   - Transaction monitoring

3. **Incident Response**
   - Documented procedures
   - Emergency contacts
   - Regular drills

## Cost Estimation

### Development (Localnet)
- **Cost**: Free
- **Use**: Development and testing

### Staging (Devnet)
- **Cost**: Free (airdrop available)
- **Use**: Integration testing

### Production (Mainnet)
- **Initial Deployment**: ~2-3 SOL
- **Program Rent**: ~1.5 SOL (one-time)
- **Transaction Fees**: ~0.000005 SOL per transaction
- **Recommended Buffer**: 10 SOL

## Rollback Procedures

If critical issues arise:

1. **Immediate Actions**
   - Document the issue
   - Assess impact
   - Notify stakeholders

2. **Mitigation**
   - If upgrade authority exists, deploy fix
   - Otherwise, migrate to new program
   - Update frontend to point to new program

3. **Communication**
   - Update status page
   - Notify users via all channels
   - Provide regular updates

## Next Steps

After successful deployment:

1. **Monitor initial usage**
2. **Gather user feedback**
3. **Plan feature updates**
4. **Schedule security audits**
5. **Optimize performance**

## Support

For deployment issues:
- Check [Anchor documentation](https://www.anchor-lang.com/)
- Review [Solana documentation](https://docs.solana.com/)
- Join [Solana Discord](https://discord.gg/solana)
- Open issues on GitHub