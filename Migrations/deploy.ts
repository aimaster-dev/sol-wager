// migrations/deploy.ts

import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import * as fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Setup connection and wallet
async function main() {
  try {
    // Determine which cluster to deploy to
    const args = process.argv.slice(2);
    const cluster = args[0] || 'devnet'; // Default to devnet
    
    console.log(`Deploying to ${cluster}...`);
    
    // Get provider
    const connection = new Connection(
      anchor.web3.clusterApiUrl(cluster as anchor.web3.Cluster),
      'confirmed'
    );
    
    // Load wallet
    const walletKeyPath = args[1] || '~/.config/solana/id.json';
    const expandedPath = walletKeyPath.replace(/^~/, process.env.HOME || '');
    
    if (!fs.existsSync(expandedPath)) {
      console.error(`Wallet keypair file not found at ${expandedPath}`);
      console.error('Make sure you have a Solana wallet configured or provide a custom path.');
      process.exit(1);
    }
    
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(expandedPath, 'utf-8')))
    );
    
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
    
    anchor.setProvider(provider);
    
    // Build the program
    console.log('Building program...');
    execSync('anchor build', { stdio: 'inherit' });
    
    // Check if the IDL file was generated
    const idlPath = './target/idl/general_wager_bet.json';
    
    if (!fs.existsSync(idlPath)) {
      console.error('IDL file not found. Build may have failed.');
      process.exit(1);
    }
    
    // Get the program ID
    const idlFile = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    
    if (!idlFile.metadata || !idlFile.metadata.address) {
      console.error('Program ID not found in IDL file. Make sure the program was built properly.');
      process.exit(1);
    }
    
    const programId = new PublicKey(idlFile.metadata.address);
    
    console.log(`Program ID: ${programId.toString()}`);
    
    // Update the program ID in Anchor.toml and lib.rs
    console.log('Updating program ID in files...');
    
    // Read lib.rs
    const libRsPath = './programs/general-wager-bet/src/lib.rs';
    
    if (!fs.existsSync(libRsPath)) {
      console.error(`lib.rs not found at ${libRsPath}`);
      process.exit(1);
    }
    
    let libRsContent = fs.readFileSync(libRsPath, 'utf-8');
    
    // Replace the program ID
    libRsContent = libRsContent.replace(
      /declare_id!\(".*"\);/,
      `declare_id!("${programId.toString()}");`
    );
    
    // Write back lib.rs
    fs.writeFileSync(libRsPath, libRsContent);
    
    // Read Anchor.toml
    const anchorTomlPath = './Anchor.toml';
    
    if (!fs.existsSync(anchorTomlPath)) {
      console.error(`Anchor.toml not found at ${anchorTomlPath}`);
      process.exit(1);
    }
    
    let anchorTomlContent = fs.readFileSync(anchorTomlPath, 'utf-8');
    
    // Replace the program ID for both localnet and devnet
    anchorTomlContent = anchorTomlContent.replace(
      /general_wager_bet = ".*"/g,
      `general_wager_bet = "${programId.toString()}"`
    );
    
    // Write back Anchor.toml
    fs.writeFileSync(anchorTomlPath, anchorTomlContent);
    
    // Update constants.ts in the React app
    console.log('Updating program ID in React app...');
    const constantsPath = './app/src/utils/constants.ts';
    
    // Check if the file exists
    if (fs.existsSync(constantsPath)) {
      let constantsContent = fs.readFileSync(constantsPath, 'utf-8');
      
      // Replace the PROGRAM_ID
      constantsContent = constantsContent.replace(
        /PROGRAM_ID = new PublicKey\(['"`].*['"`]\)/,
        `PROGRAM_ID = new PublicKey('${programId.toString()}')`
      );
      
      // Write back constants.ts
      fs.writeFileSync(constantsPath, constantsContent);
    } else {
      console.warn(`Warning: ${constantsPath} does not exist, creating it...`);
      
      // Create constants.ts directory if it doesn't exist
      const constantsDir = path.dirname(constantsPath);
      if (!fs.existsSync(constantsDir)) {
        fs.mkdirSync(constantsDir, { recursive: true });
      }
      
      // Create a new constants.ts file with the correct program ID
      const constantsContent = `// src/utils/constants.ts
// Constants for the application

import { PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Program ID
export const PROGRAM_ID = new PublicKey('${programId.toString()}');

// Network to use
export const NETWORK = WalletAdapterNetwork.Devnet;

// Token decimals
export const TOKEN_DECIMALS = 9;

// Wager status
export enum WagerStatus {
  Created = 0,
  Active = 1,
  Resolved = 2
}

// Wager resolution
export enum WagerResolution {
  Pending = 0,
  YesWon = 1,
  NoWon = 2,
  Draw = 3
}

// Order status
export enum OrderStatus {
  Active = 0,
  Filled = 1,
  PartiallyFilled = 2,
  Cancelled = 3,
  PartiallyCancelled = 4
}
`;
      
      fs.writeFileSync(constantsPath, constantsContent);
    }
    
    // Deploy the program
    console.log('Deploying program...');
    execSync(`anchor deploy --provider.cluster ${cluster}`, { stdio: 'inherit' });
    
    console.log('Generating TypeScript bindings...');
    execSync('anchor build --idl', { stdio: 'inherit' });
    
    console.log('Deployment complete!');
    console.log('Program ID:', programId.toString());
  } catch (error) {
    console.error('Deployment failed with error:', error);
    process.exit(1);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);