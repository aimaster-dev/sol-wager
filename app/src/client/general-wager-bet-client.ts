// src/client/general-wager-bet-client.ts

import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
  ConfirmOptions
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import BN from 'bn.js';
import { Buffer } from 'buffer';
import { PROGRAM_ID, NETWORK, TOKEN_DECIMALS } from '../utils/constants';

// This is a placeholder for the IDL until the actual IDL is generated
const mockIdl = {
  "version": "0.1.0",
  "name": "general_wager_bet",
  "instructions": [],
  "accounts": [],
  "types": [],
  "metadata": {
    "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
  }
};

// Try to load the real IDL but fall back to mock if needed
let idl;
try {
  idl = require('../../target/idl/general_wager_bet.json');
  console.log("Loaded real IDL file");
} catch (e) {
  console.warn("Warning: Using mock IDL instead of real file");
  idl = mockIdl;
}

export class WagerBetClient {
  private program: Program<any>;
  private platformPDA: PublicKey | null = null;
  private platformVaultPDA: PublicKey | null = null;
  public connection: Connection;
  private wallet: anchor.Wallet;
  private opts: ConfirmOptions;

  constructor(
    wallet: anchor.Wallet,
    connection: Connection,
    programId: PublicKey,
    confirmOptions: ConfirmOptions = { commitment: 'confirmed' }
  ) {
    // Initialize anchor provider and program
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      confirmOptions
    );
    
    // For actual development, uncomment this block
    /*
    // Load program from IDL
    this.program = new anchor.Program(
      idl as anchor.Idl,
      programId,
      provider
    );
    */
    
    // Create a mock program for development
    this.program = {
      account: {
        platform: {
          fetch: () => Promise.resolve({
            authority: wallet.publicKey,
            deploymentFee: new BN(1_000_000_000), // 1 SOL
            tradingFeeBps: 50, // 0.5%
            wagerCount: new BN(1)
          }),
          all: () => Promise.resolve([]),
          subscribe: () => {
            const emitter: any = { on: () => {} };
            return emitter;
          }
        },
        wager: {
          fetch: () => Promise.resolve({
            authority: wallet.publicKey,
            platform: new PublicKey("11111111111111111111111111111111"),
            name: "Test Wager",
            description: "This is a test wager",
            openingTime: new BN(Math.floor(Date.now() / 1000) - 3600),
            conclusionTime: new BN(Math.floor(Date.now() / 1000) + 3600),
            conclusionDetails: "Resolves based on...",
            yesMint: new PublicKey("11111111111111111111111111111111"),
            noMint: new PublicKey("11111111111111111111111111111111"),
            yesVault: new PublicKey("11111111111111111111111111111111"),
            noVault: new PublicKey("11111111111111111111111111111111"),
            solVault: new PublicKey("11111111111111111111111111111111"),
            status: 1, // Active
            resolution: 0, // Pending
            index: new BN(0)
          }),
          all: () => Promise.resolve([
            {
              publicKey: new PublicKey("11111111111111111111111111111111"),
              account: {
                authority: wallet.publicKey,
                platform: new PublicKey("11111111111111111111111111111111"),
                name: "Will Team A win?",
                description: "This wager is about whether Team A will win the championship.",
                openingTime: new BN(Math.floor(Date.now() / 1000) - 3600),
                conclusionTime: new BN(Math.floor(Date.now() / 1000) + 3600),
                conclusionDetails: "Resolves based on official announcement.",
                yesMint: new PublicKey("11111111111111111111111111111111"),
                noMint: new PublicKey("11111111111111111111111111111111"),
                yesVault: new PublicKey("11111111111111111111111111111111"),
                noVault: new PublicKey("11111111111111111111111111111111"),
                solVault: new PublicKey("11111111111111111111111111111111"),
                status: 1, // Active
                resolution: 0, // Pending
                index: new BN(0)
              }
            }
          ]),
          subscribe: () => {
            const emitter: any = { on: () => {} };
            return emitter;
          }
        },
        orderBook: {
          fetch: () => Promise.resolve({
            wager: new PublicKey("11111111111111111111111111111111"),
            nextOrderId: new BN(1),
            activeOrdersCount: new BN(0)
          }),
          all: () => Promise.resolve([]),
          subscribe: () => {
            const emitter: any = { on: () => {} };
            return emitter;
          }
        },
        order: {
          fetch: () => Promise.resolve({}),
          all: () => Promise.resolve([]),
          subscribe: () => {
            const emitter: any = { on: () => {} };
            return emitter;
          }
        }
      },
      methods: {
        initializePlatform: () => ({ accounts: () => ({ signers: () => ({ rpc: () => Promise.resolve('tx') }) }) }),
        createWager: () => ({ accounts: () => ({ preInstructions: () => ({ signers: () => ({ rpc: () => Promise.resolve('tx') }) }) }) }),
        depositSol: () => ({ accounts: () => ({ rpc: () => Promise.resolve('tx') }) }),
        createOrder: () => ({ accounts: () => ({ signers: () => ({ rpc: () => Promise.resolve('tx') }) }) }),
        cancelOrder: () => ({ accounts: () => ({ rpc: () => Promise.resolve('tx') }) }),
        resolveWager: () => ({ accounts: () => ({ rpc: () => Promise.resolve('tx') }) }),
        claimWinnings: () => ({ accounts: () => ({ rpc: () => Promise.resolve('tx') }) })
      },
      programId: programId,
      provider: provider
    } as any;
    
    this.connection = connection;
    this.wallet = wallet;
    this.opts = confirmOptions;
    
    // Initialize platform PDAs when creating client
    this.initializePlatformPDAs();
  }

  /**
   * Initialize Platform PDAs
   */
  private async initializePlatformPDAs() {
    // Calculate platform PDA
    const [platformPDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      this.program.programId
    );
    
    // Calculate platform vault PDA
    const [platformVaultPDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("platform_vault"), platformPDA.toBuffer()],
      this.program.programId
    );
    
    this.platformPDA = platformPDA;
    this.platformVaultPDA = platformVaultPDA;
  }

  /**
   * Get platform PDA
   */
  public async getPlatformPDA(): Promise<PublicKey | null> {
    if (!this.platformPDA) {
      await this.initializePlatformPDAs();
    }
    return this.platformPDA;
  }

  /**
   * Initialize the betting platform
   */
  async initializePlatform(): Promise<string> {
    console.log('Initializing platform');
    
    try {
      // In a real implementation, this would call the actual program
      /*
      const tx = await this.program.methods
        .initializePlatform()
        .accounts({
          platform: this.platformPDA,
          authority: this.wallet.publicKey,
          platformVault: this.platformVaultPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();
      */
      
      // Mock implementation
      return 'mock-tx-id';
    } catch (error) {
      console.error("Error initializing platform:", error);
      throw error;
    }
  }

  /**
   * Create a new wager proposition
   */
  async createWager(
    name: string,
    description: string,
    openingTime: number,
    conclusionTime: number,
    conclusionDetails: string
  ): Promise<any> {
    console.log('Creating wager:', name);
    
    try {
      // Generate keypairs for yes and no mints
      const yesMintKP = Keypair.generate();
      const noMintKP = Keypair.generate();
      
      // Create a new wager account
      const wagerKP = Keypair.generate();
      
      // Generate PDAs for various accounts
      const [orderBookPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("order_book"), wagerKP.publicKey.toBuffer()],
        this.program.programId
      );
      
      const [yesVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("yes_vault"), wagerKP.publicKey.toBuffer()],
        this.program.programId
      );
      
      const [noVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("no_vault"), wagerKP.publicKey.toBuffer()],
        this.program.programId
      );
      
      const [solVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("sol_vault"), wagerKP.publicKey.toBuffer()],
        this.program.programId
      );
      
      // Generate associated token accounts for the deployer
      const deployerYesTokenAddress = await getAssociatedTokenAddress(
        yesMintKP.publicKey,
        this.wallet.publicKey
      );
      
      const deployerNoTokenAddress = await getAssociatedTokenAddress(
        noMintKP.publicKey,
        this.wallet.publicKey
      );
      
      // In a real implementation, this would call the actual program
      /*
      const tx = await this.program.methods
        .createWager(
          name,
          description,
          new BN(openingTime),
          new BN(conclusionTime),
          conclusionDetails
        )
        .accounts({
          wager: wagerKP.publicKey,
          orderBook: orderBookPDA,
          platform: this.platformPDA,
          platformVault: this.platformVaultPDA,
          wagerCreator: this.wallet.publicKey,
          yesMint: yesMintKP.publicKey,
          noMint: noMintKP.publicKey,
          deployerYesToken: deployerYesTokenAddress,
          deployerNoToken: deployerNoTokenAddress,
          yesVault: yesVaultPDA,
          noVault: noVaultPDA,
          solVault: solVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .preInstructions([
          // Create associated token accounts for the deployer
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey,
            deployerYesTokenAddress,
            this.wallet.publicKey,
            yesMintKP.publicKey
          ),
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey,
            deployerNoTokenAddress,
            this.wallet.publicKey,
            noMintKP.publicKey
          ),
        ])
        .signers([wagerKP, yesMintKP, noMintKP])
        .rpc();
      */
      
      // Mock implementation
      return {
        txSignature: "mock-tx-id",
        wagerPDA: wagerKP.publicKey,
        yesMintPDA: yesMintKP.publicKey,
        noMintPDA: noMintKP.publicKey
      };
    } catch (error) {
      console.error("Error creating wager:", error);
      throw error;
    }
  }

  /**
   * Deposit SOL to mint YES and NO tokens
   */
  async depositSol(
    wagerPDA: PublicKey,
    yesMintPDA: PublicKey,
    noMintPDA: PublicKey,
    amount: number
  ): Promise<string> {
    console.log('Depositing SOL:', amount);
    
    try {
      // Convert amount to lamports (amount is in SOL)
      const lamports = Math.floor(amount * 1_000_000_000);
      
      // Get user's token accounts
      const userYesTokenAddress = await getAssociatedTokenAddress(
        yesMintPDA,
        this.wallet.publicKey
      );
      
      const userNoTokenAddress = await getAssociatedTokenAddress(
        noMintPDA,
        this.wallet.publicKey
      );
      
      // Get the SOL vault PDA
      const [solVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("sol_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      // In a real implementation, this would call the actual program
      /*
      // Check if token accounts exist, if not create them
      const createYesTokenIx = createAssociatedTokenAccountInstruction(
        this.wallet.publicKey,
        userYesTokenAddress,
        this.wallet.publicKey,
        yesMintPDA
      );
      
      const createNoTokenIx = createAssociatedTokenAccountInstruction(
        this.wallet.publicKey,
        userNoTokenAddress,
        this.wallet.publicKey,
        noMintPDA
      );
      
      const tx = await this.program.methods
        .depositSol(new BN(lamports))
        .accounts({
          wager: wagerPDA,
          user: this.wallet.publicKey,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          userYesToken: userYesTokenAddress,
          userNoToken: userNoTokenAddress,
          solVault: solVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      */
      
      // Mock implementation
      return 'mock-tx-id';
    } catch (error) {
      console.error("Error depositing SOL:", error);
      throw error;
    }
  }

  /**
   * Create a new order to buy or sell tokens
   */
  async createOrder(
    wagerPDA: PublicKey,
    orderBookPDA: PublicKey,
    yesMintPDA: PublicKey,
    noMintPDA: PublicKey,
    isBuy: boolean,
    isYesToken: boolean,
    price: number,
    quantity: number
  ): Promise<string> {
    console.log(`Creating ${isBuy ? 'buy' : 'sell'} order for ${quantity} ${isYesToken ? 'YES' : 'NO'} tokens at ${price} SOL each`);
    
    try {
      // Convert price to lamports and quantity to token amount
      const priceInLamports = Math.floor(price * 1_000_000_000);
      const quantityInTokens = Math.floor(quantity * 1_000_000_000);
      
      // Generate a new keypair for the order
      const orderKP = Keypair.generate();
      
      // Get user's token accounts
      const userYesTokenAddress = await getAssociatedTokenAddress(
        yesMintPDA,
        this.wallet.publicKey
      );
      
      const userNoTokenAddress = await getAssociatedTokenAddress(
        noMintPDA,
        this.wallet.publicKey
      );
      
      // Get the token vault PDAs
      const [yesVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("yes_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      const [noVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("no_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      // In a real implementation, this would call the actual program
      /*
      const tx = await this.program.methods
        .createOrder(
          isBuy,
          isYesToken,
          new BN(priceInLamports),
          new BN(quantityInTokens)
        )
        .accounts({
          order: orderKP.publicKey,
          orderBook: orderBookPDA,
          wager: wagerPDA,
          user: this.wallet.publicKey,
          userYesToken: userYesTokenAddress,
          userNoToken: userNoTokenAddress,
          yesVault: yesVaultPDA,
          noVault: noVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([orderKP])
        .rpc();
      */
      
      // Mock implementation
      return 'mock-tx-id';
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderPDA: PublicKey,
    orderBookPDA: PublicKey,
    wagerPDA: PublicKey,
    yesMintPDA: PublicKey,
    noMintPDA: PublicKey
  ): Promise<string> {
    console.log('Cancelling order');
    
    try {
      // Get user's token accounts
      const userYesTokenAddress = await getAssociatedTokenAddress(
        yesMintPDA,
        this.wallet.publicKey
      );
      
      const userNoTokenAddress = await getAssociatedTokenAddress(
        noMintPDA,
        this.wallet.publicKey
      );
      
      // Get the token vault PDAs
      const [yesVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("yes_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      const [noVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("no_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      // In a real implementation, this would call the actual program
      /*
      const tx = await this.program.methods
        .cancelOrder()
        .accounts({
          order: orderPDA,
          orderBook: orderBookPDA,
          wager: wagerPDA,
          user: this.wallet.publicKey,
          userYesToken: userYesTokenAddress,
          userNoToken: userNoTokenAddress,
          yesVault: yesVaultPDA,
          noVault: noVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      */
      
      // Mock implementation
      return 'mock-tx-id';
    } catch (error) {
      console.error("Error cancelling order:", error);
      throw error;
    }
  }

  /**
   * Resolve a wager (platform authority only)
   */
  async resolveWager(
    wagerPDA: PublicKey,
    resolution: 0 | 1 | 2 // 0 = YES, 1 = NO, 2 = Draw
  ): Promise<string> {
    console.log('Resolving wager:', resolution);
    
    try {
      // In a real implementation, this would call the actual program
      /*
      const tx = await this.program.methods
        .resolveWager(resolution)
        .accounts({
          wager: wagerPDA,
          platform: this.platformPDA,
          authority: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      */
      
      // Mock implementation
      return 'mock-tx-id';
    } catch (error) {
      console.error("Error resolving wager:", error);
      throw error;
    }
  }

  /**
   * Claim winnings from a resolved wager
   */
  async claimWinnings(
    wagerPDA: PublicKey,
    yesMintPDA: PublicKey,
    noMintPDA: PublicKey
  ): Promise<string> {
    console.log('Claiming winnings');
    
    try {
      // Get user's token accounts
      const userYesTokenAddress = await getAssociatedTokenAddress(
        yesMintPDA,
        this.wallet.publicKey
      );
      
      const userNoTokenAddress = await getAssociatedTokenAddress(
        noMintPDA,
        this.wallet.publicKey
      );
      
      // Get the SOL vault PDA
      const [solVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("sol_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      // In a real implementation, this would call the actual program
      /*
      const tx = await this.program.methods
        .claimWinnings()
        .accounts({
          wager: wagerPDA,
          user: this.wallet.publicKey,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          userYesToken: userYesTokenAddress,
          userNoToken: userNoTokenAddress,
          solVault: solVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      */
      
      // Mock implementation
      return 'mock-tx-id';
    } catch (error) {
      console.error("Error claiming winnings:", error);
      throw error;
    }
  }

  /**
   * Get a wager's details
   */
  async getWagerDetails(wagerPDA: PublicKey): Promise<any> {
    console.log('Getting wager details');
    
    try {
      // In a real implementation, this would fetch actual data
      /*
      const wagerAccount = await this.program.account.wager.fetch(wagerPDA);
      return wagerAccount;
      */
      
      // Mock implementation
      return {
        authority: this.wallet.publicKey,
        platform: new PublicKey("11111111111111111111111111111111"),
        name: "Test Wager",
        description: "This is a test wager",
        openingTime: Math.floor(Date.now() / 1000) - 3600,
        conclusionTime: Math.floor(Date.now() / 1000) + 3600,
        conclusionDetails: "Resolves based on...",
        yesMint: new PublicKey("11111111111111111111111111111111"),
        noMint: new PublicKey("11111111111111111111111111111111"),
        yesVault: new PublicKey("11111111111111111111111111111111"),
        noVault: new PublicKey("11111111111111111111111111111111"),
        solVault: new PublicKey("11111111111111111111111111111111"),
        status: 1, // Active
        resolution: 0 // Pending
      };
    } catch (error) {
      console.error("Error getting wager details:", error);
      throw error;
    }
  }

  /**
   * Get all active wagers
   */
  async getAllWagers(): Promise<any[]> {
    console.log('Getting all wagers');
    
    try {
      // In a real implementation, this would fetch actual data
      /*
      const allWagers = await this.program.account.wager.all();
      return allWagers.map(wager => ({
        publicKey: wager.publicKey.toString(),
        account: wager.account
      }));
      */
      
      // Mock implementation
      return [
        {
          publicKey: new PublicKey("11111111111111111111111111111111").toString(),
          account: {
            authority: this.wallet.publicKey,
            platform: new PublicKey("11111111111111111111111111111111"),
            name: "Will Team A win?",
            description: "This wager is about whether Team A will win the championship.",
            openingTime: Math.floor(Date.now() / 1000) - 3600,
            conclusionTime: Math.floor(Date.now() / 1000) + 3600,
            conclusionDetails: "Resolves based on official announcement.",
            yesMint: new PublicKey("11111111111111111111111111111111"),
            noMint: new PublicKey("11111111111111111111111111111111"),
            yesVault: new PublicKey("11111111111111111111111111111111"),
            noVault: new PublicKey("11111111111111111111111111111111"),
            solVault: new PublicKey("11111111111111111111111111111111"),
            status: 1, // Active
            resolution: 0 // Pending
          }
        }
      ];
    } catch (error) {
      console.error("Error getting all wagers:", error);
      throw error;
    }
  }

  /**
   * Get the order book PDA for a wager
   */
  async getOrderBookPDA(wagerPDA: PublicKey): Promise<PublicKey> {
    console.log('Getting order book PDA');
    
    try {
      // Calculate order book PDA
      const [orderBookPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("order_book"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      return orderBookPDA;
    } catch (error) {
      console.error("Error getting order book PDA:", error);
      throw error;
    }
  }
  
  /**
   * Subscribe to wager updates
   */
  subscribeToWagerUpdates(
    wagerPDA: PublicKey, 
    callback: (wagerAccount: any) => void
  ): number {
    console.log('Subscribing to wager updates');
    
    try {
      // In a real implementation, this would set up a subscription
      /*
      const subscriptionId = this.program.account.wager.subscribe(wagerPDA);
      this.program.account.wager.on('change', account => {
        callback(account);
      });
      return subscriptionId;
      */
      
      // Mock implementation
      return 12345;
    } catch (error) {
      console.error("Error subscribing to wager updates:", error);
      throw error;
    }
  }
  
  /**
   * Subscribe to order book updates
   */
  subscribeToOrderBookUpdates(
    orderBookPDA: PublicKey,
    callback: (orderBookAccount: any) => void
  ): number {
    console.log('Subscribing to order book updates');
    
    try {
      // In a real implementation, this would set up a subscription
      /*
      const subscriptionId = this.program.account.orderBook.subscribe(orderBookPDA);
      this.program.account.orderBook.on('change', account => {
        callback(account);
      });
      return subscriptionId;
      */
      
      // Mock implementation
      return 67890;
    } catch (error) {
      console.error("Error subscribing to order book updates:", error);
      throw error;
    }
  }
  
  /**
   * Unsubscribe from account updates
   */
  unsubscribe(subscriptionId: number): void {
    console.log(`Unsubscribing from ${subscriptionId}`);
    
    try {
      // In a real implementation, this would unsubscribe
      /*
      this.connection.removeAccountChangeListener(subscriptionId);
      */
      
      // Mock implementation - no action needed
    } catch (error) {
      console.error("Error unsubscribing:", error);
      throw error;
    }
  }
  
  /**
   * Get token balances for a user
   */
  async getUserTokenBalances(
    userPDA: PublicKey,
    yesMintPDA: PublicKey,
    noMintPDA: PublicKey
  ): Promise<{ yesBalance: number, noBalance: number }> {
    console.log('Getting user token balances');
    
    try {
      // Get user's token accounts
      const userYesTokenAddress = await getAssociatedTokenAddress(
        yesMintPDA,
        userPDA
      );
      
      const userNoTokenAddress = await getAssociatedTokenAddress(
        noMintPDA,
        userPDA
      );
      
      // In a real implementation, this would fetch actual balances
      /*
      let yesBalance = 0;
      let noBalance = 0;
      
      try {
        const yesAccount = await getAccount(this.connection, userYesTokenAddress);
        yesBalance = Number(yesAccount.amount);
      } catch (error) {
        console.log("No YES token account found or other error:", error);
      }
      
      try {
        const noAccount = await getAccount(this.connection, userNoTokenAddress);
        noBalance = Number(noAccount.amount);
      } catch (error) {
        console.log("No NO token account found or other error:", error);
      }
      
      return { yesBalance, noBalance };
      */
      
      // Mock implementation
      return { 
        yesBalance: Math.floor(Math.random() * 100) * 1_000_000_000, 
        noBalance: Math.floor(Math.random() * 100) * 1_000_000_000 
      };
    } catch (error) {
      console.error("Error getting user token balances:", error);
      throw error;
    }
  }
  
  /**
   * Automatic position buying - deposits SOL and automatically trades for desired token
   * This is a simplified interface that handles everything in one transaction
   */
  async buyPosition(
    wagerPDA: PublicKey,
    isYesToken: boolean,
    solAmount: number
  ): Promise<string> {
    console.log(`Buying ${isYesToken ? 'YES' : 'NO'} position with ${solAmount} SOL`);
    
    try {
      // Convert SOL amount to lamports
      const lamports = Math.floor(solAmount * 1_000_000_000);
      
      // Get wager details to find mints
      const wagerAccount = await this.getWagerDetails(wagerPDA);
      const yesMintPDA = wagerAccount.yesMint;
      const noMintPDA = wagerAccount.noMint;
      
      // Get order book PDA
      const orderBookPDA = await this.getOrderBookPDA(wagerPDA);
      
      // Generate a new keypair for the order
      const orderKP = Keypair.generate();
      
      // Get user's token accounts
      const userYesTokenAddress = await getAssociatedTokenAddress(
        yesMintPDA,
        this.wallet.publicKey
      );
      
      const userNoTokenAddress = await getAssociatedTokenAddress(
        noMintPDA,
        this.wallet.publicKey
      );
      
      // Get vault PDAs
      const [yesVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("yes_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      const [noVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("no_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      const [solVaultPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("sol_vault"), wagerPDA.toBuffer()],
        this.program.programId
      );
      
      // Get platform PDA
      const platformPDA = await this.getPlatformPDA();
      
      // In a real implementation, this would call the buy_position instruction
      /*
      const tx = await this.program.methods
        .buyPosition(isYesToken, new BN(lamports))
        .accounts({
          wager: wagerPDA,
          orderBook: orderBookPDA,
          order: orderKP.publicKey,
          platform: platformPDA,
          user: this.wallet.publicKey,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          userYesToken: userYesTokenAddress,
          userNoToken: userNoTokenAddress,
          yesVault: yesVaultPDA,
          noVault: noVaultPDA,
          solVault: solVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([orderKP])
        .rpc();
      */
      
      // Mock implementation
      console.log(`Successfully bought ${isYesToken ? 'YES' : 'NO'} position`);
      console.log(`- Deposited: ${solAmount} SOL`);
      console.log(`- Received: ${solAmount * 100} ${isYesToken ? 'YES' : 'NO'} tokens`);
      console.log(`- Selling: ${solAmount * 100} ${isYesToken ? 'NO' : 'YES'} tokens on order book`);
      
      return 'mock-tx-id';
    } catch (error) {
      console.error("Error buying position:", error);
      throw error;
    }
  }
  
  /**
   * Calculate the effective price for buying a position
   * This considers the current order book state
   */
  async calculatePositionCost(
    wagerPDA: PublicKey,
    isYesToken: boolean,
    solAmount: number
  ): Promise<{
    totalCost: number,
    effectivePrice: number,
    tokensReceived: number,
    priceImpact: number
  }> {
    try {
      // Get current orders
      const orders = await this.getOrdersForWager(wagerPDA);
      
      // Filter for buy orders of the opposite token (what we'll be selling)
      const relevantOrders = orders.filter(order => 
        order.account.isBuy && 
        order.account.isYesToken !== isYesToken &&
        order.account.status === 0 // Active
      ).sort((a, b) => b.account.price - a.account.price); // Sort by price descending
      
      // Calculate how many tokens we'll get
      const tokensToMint = solAmount * 100;
      
      // Calculate average sell price for the unwanted tokens
      let totalRevenue = 0;
      let remainingTokens = tokensToMint;
      
      for (const order of relevantOrders) {
        if (remainingTokens <= 0) break;
        
        const orderQuantity = order.account.remainingQuantity / 1_000_000_000;
        const orderPrice = order.account.price / 1_000_000_000;
        
        const tokensToSell = Math.min(remainingTokens, orderQuantity);
        totalRevenue += tokensToSell * orderPrice;
        remainingTokens -= tokensToSell;
      }
      
      // If we can't sell all unwanted tokens, assume market price for the rest
      if (remainingTokens > 0) {
        totalRevenue += remainingTokens * 0.5; // Assume 0.5 SOL default
      }
      
      // Calculate effective cost
      const effectiveCost = solAmount - totalRevenue;
      const effectivePrice = effectiveCost / tokensToMint;
      
      // Calculate price impact (difference from balanced 0.5 SOL price)
      const priceImpact = ((effectivePrice - 0.01) / 0.01) * 100;
      
      return {
        totalCost: effectiveCost,
        effectivePrice: effectivePrice,
        tokensReceived: tokensToMint,
        priceImpact: priceImpact
      };
    } catch (error) {
      console.error("Error calculating position cost:", error);
      // Return default values
      return {
        totalCost: solAmount,
        effectivePrice: 0.01,
        tokensReceived: solAmount * 100,
        priceImpact: 0
      };
    }
  }

  /**
   * Get orders for a wager
   */
  async getOrdersForWager(wagerPDA: PublicKey): Promise<any[]> {
    console.log('Getting orders for wager');
    
    try {
      // In a real implementation, this would fetch actual orders
      /*
      const orders = await this.program.account.order.all([
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator and id, start at wager field
            bytes: wagerPDA.toBase58()
          }
        }
      ]);
      
      return orders;
      */
      
      // Mock implementation - generate some sample orders
      const orderCount = Math.floor(Math.random() * 5) + 1;
      const orders = [];
      
      for (let i = 0; i < orderCount; i++) {
        const isBuy = Math.random() > 0.5;
        const isYesToken = Math.random() > 0.5;
        const price = Math.floor(Math.random() * 500 + 100) * 1_000_000; // 0.1 to 0.6 SOL
        const quantity = Math.floor(Math.random() * 50 + 10) * 1_000_000_000; // 10-60 tokens
        
        orders.push({
          publicKey: new PublicKey(Keypair.generate().publicKey).toString(),
          account: {
            id: i + 1,
            owner: Math.random() > 0.7 ? this.wallet.publicKey : new PublicKey(Keypair.generate().publicKey),
            wager: wagerPDA,
            isBuy,
            isYesToken,
            price,
            originalQuantity: quantity,
            remainingQuantity: Math.floor(Math.random() * quantity) + 1,
            status: 0, // Active
            createdAt: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600)
          }
        });
      }
      
      return orders;
    } catch (error) {
      console.error("Error getting orders for wager:", error);
      throw error;
    }
  }
}