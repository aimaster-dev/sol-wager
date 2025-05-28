# Production Deployment Checklist

This checklist ensures all necessary steps are completed before deploying Wagers.bet to production.

## Pre-Deployment

### Security Audit
- [ ] Smart contract audit completed by reputable firm
- [ ] Frontend security review completed
- [ ] Penetration testing performed
- [ ] All critical vulnerabilities addressed

### Program Preparation
- [ ] Program deployed to mainnet-beta
- [ ] Program upgrade authority transferred to multisig
- [ ] Platform authority set to operational wallet
- [ ] Deployment fee configured appropriately
- [ ] Trading fees set to production values

### Frontend Preparation
- [ ] Environment variables configured for mainnet
- [ ] Error tracking service configured (Sentry/LogRocket)
- [ ] Analytics configured (Google Analytics/Mixpanel)
- [ ] Performance monitoring setup
- [ ] CDN configured for static assets
- [ ] SSL certificate installed

### Infrastructure
- [ ] RPC endpoint secured (Helius/Triton/QuickNode)
- [ ] Rate limiting configured
- [ ] DDoS protection enabled
- [ ] Database backups configured (if applicable)
- [ ] Monitoring alerts configured

## Deployment Steps

### 1. Program Deployment
```bash
# Set cluster to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Deploy program
anchor deploy --provider.cluster mainnet

# Verify deployment
solana program show <PROGRAM_ID>
```

### 2. Initialize Platform
```bash
# Run initialization script
ts-node migrations/deploy.ts mainnet

# Verify platform account
solana account <PLATFORM_PDA>
```

### 3. Frontend Deployment
```bash
# Build with production config
cd app
npm run build

# Deploy to hosting service
./scripts/deploy-frontend.sh [vercel|netlify]
```

### 4. DNS Configuration
- [ ] Point domain to hosting service
- [ ] Configure www redirect
- [ ] Set up email records (SPF, DKIM, DMARC)

## Post-Deployment

### Verification
- [ ] All features working on mainnet
- [ ] Wallet connections functional
- [ ] Transactions processing correctly
- [ ] Error tracking receiving data
- [ ] Analytics tracking pageviews

### Monitoring
- [ ] Set up uptime monitoring (UptimeRobot/Pingdom)
- [ ] Configure transaction monitoring
- [ ] Set up alert thresholds
- [ ] Create status page

### Documentation
- [ ] Update README with mainnet addresses
- [ ] Document emergency procedures
- [ ] Create runbook for common issues
- [ ] Train support team

### Legal & Compliance
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Jurisdiction restrictions implemented
- [ ] KYC/AML requirements evaluated

## Emergency Procedures

### Program Issues
1. **Pause Trading**: Update wager status to prevent new orders
2. **Freeze Funds**: Prevent withdrawals if necessary
3. **Communicate**: Notify users via all channels
4. **Fix & Test**: Deploy fix to devnet first
5. **Upgrade**: Use program upgrade authority

### Frontend Issues
1. **Rollback**: Revert to previous deployment
2. **Disable Features**: Use feature flags if available
3. **Cache Clear**: Purge CDN cache
4. **DNS Failover**: Switch to backup if necessary

### Security Incident
1. **Isolate**: Disable affected functionality
2. **Assess**: Determine scope of incident
3. **Communicate**: Notify affected users
4. **Remediate**: Fix vulnerability
5. **Post-mortem**: Document lessons learned

## Maintenance Windows

- **Weekly**: Tuesdays 02:00-04:00 UTC
- **Monthly**: First Sunday 00:00-06:00 UTC
- **Emergency**: As needed with user notification

## Contact Information

- **Technical Lead**: [Email]
- **Security Team**: [Email]
- **DevOps On-Call**: [Phone]
- **Legal Counsel**: [Email]

## Version History

| Version | Date | Changes | Deployed By |
|---------|------|---------|-------------|
| 1.0.0   | TBD  | Initial mainnet launch | - |