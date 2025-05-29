import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { IpredictClient, TokenType, OrderSide } from '../sdk/src';
import fs from 'fs';
import path from 'path';

async function testWager() {
  const network = process.argv.includes('--network') 
    ? process.argv[process.argv.indexOf('--network') + 1] 
    : 'localnet';

  console.log(`Testing wager creation on ${network}...`);

  // Configure connection
  const endpoint = network === 'localnet' 
    ? 'http://localhost:8899' 
    : `https://api.${network}.solana.com`;
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
    // Create a test wager
    console.log('Creating test wager...');
    const now = Math.floor(Date.now() / 1000);
    const tx = await client.createWager({
      name: 'Will this test wager work correctly?',
      description: 'This is a test wager to verify the platform functionality. It will resolve to YES if everything works as expected.',
      openingTime: new BN(now),
      closingTime: new BN(now + 3600), // 1 hour from now
      resolutionTime: new BN(now + 7200), // 2 hours from now
    });
    console.log('Wager created! Transaction:', tx);

    // Get the created wager
    const platform = await client.getPlatform();
    if (!platform) {
      throw new Error('Platform not found');
    }
    
    const wagerId = platform.totalWagersCreated.sub(new BN(1));
    const wager = await client.getWager(wagerId);
    
    if (!wager) {
      throw new Error('Wager not found');
    }

    console.log('\nWager details:');
    console.log('- ID:', wagerId.toString());
    console.log('- Name:', wager.name);
    console.log('- Creator:', wager.creator.toBase58());
    console.log('- YES mint:', wager.yesMint.toBase58());
    console.log('- NO mint:', wager.noMint.toBase58());

    // Deposit and mint tokens
    console.log('\nDepositing 1 SOL and minting tokens...');
    const depositTx = await client.depositAndMint(wagerId, new BN(LAMPORTS_PER_SOL));
    console.log('Deposit transaction:', depositTx);

    // Place a test order
    console.log('\nPlacing a test order...');
    const orderTx = await client.placeOrder({
      wagerId,
      side: OrderSide.Buy,
      tokenType: TokenType.Yes,
      price: new BN(5_000_000), // 0.005 SOL per token
      quantity: new BN(50), // 50 tokens
    });
    console.log('Order placed! Transaction:', orderTx);

    // Check order book
    const orderBook = await client.getOrderBook(wagerId);
    if (orderBook) {
      console.log('\nOrder book:');
      console.log('- Buy orders (YES):', orderBook.buyOrdersYes.length);
      console.log('- Sell orders (YES):', orderBook.sellOrdersYes.length);
      console.log('- Buy orders (NO):', orderBook.buyOrdersNo.length);
      console.log('- Sell orders (NO):', orderBook.sellOrdersNo.length);
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testWager()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });