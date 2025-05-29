import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { IpredictClient } from '../sdk/src/client';
import fs from 'fs';
import path from 'path';

async function initializePlatform() {
  const network = process.argv.includes('--network') 
    ? process.argv[process.argv.indexOf('--network') + 1] 
    : 'localnet';

  console.log(`Initializing platform on ${network}...`);

  // Configure connection
  let endpoint: string;
  switch (network) {
    case 'localnet':
      endpoint = 'http://localhost:8899';
      break;
    case 'devnet':
      endpoint = 'https://api.devnet.solana.com';
      break;
    case 'mainnet':
      endpoint = 'https://api.mainnet-beta.solana.com';
      break;
    default:
      throw new Error(`Unknown network: ${network}`);
  }

  const connection = new Connection(endpoint, 'confirmed');

  // Load deployer keypair
  const keyPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const keyData = fs.readFileSync(keyPath, 'utf-8');
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(keyData))
  );

  const wallet = new Wallet(keypair);
  const client = new IpredictClient(connection, wallet);

  try {
    // Check if platform is already initialized
    const platform = await client.getPlatform();
    if (platform) {
      console.log('Platform already initialized!');
      console.log('Platform authority:', platform.authority.toBase58());
      return;
    }

    // Initialize platform
    console.log('Initializing platform...');
    const tx = await client.initializePlatform();
    console.log('Platform initialized! Transaction:', tx);

    // Verify initialization
    const newPlatform = await client.getPlatform();
    if (newPlatform) {
      console.log('Platform details:');
      console.log('- Authority:', newPlatform.authority.toBase58());
      console.log('- Fee recipient:', newPlatform.feeRecipient.toBase58());
      console.log('- Creation fee:', newPlatform.wagerCreationFee.toString(), 'lamports');
      console.log('- Platform fee:', newPlatform.platformFeeBps, 'bps');
      console.log('- Deployer fee:', newPlatform.deployerFeeBps, 'bps');
    }
  } catch (error) {
    console.error('Failed to initialize platform:', error);
    process.exit(1);
  }
}

initializePlatform()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });