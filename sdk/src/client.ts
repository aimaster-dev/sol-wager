import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Commitment,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  Platform,
  Wager,
  OrderBook,
  UserPosition,
  CreateWagerParams,
  PlaceOrderParams,
  QuickBuyParams,
  Resolution,
  OrderSide,
  TokenType,
  WagerStatus,
} from './types';
import {
  getPlatformPDA,
  getWagerPDA,
  getVaultPDA,
  getOrderBookPDA,
  getUserPositionPDA,
  getYesMintPDA,
  getNoMintPDA,
  getEscrowPDA,
  confirmTransaction,
} from './utils';
import { PROGRAM_ID } from './constants';
import IDL from './idl/ipredict_xyz.json';

export class IpredictClient {
  private connection: Connection;
  private wallet: Wallet;
  private program: Program;
  private provider: AnchorProvider;

  constructor(connection: Connection, wallet: Wallet, commitment: Commitment = 'confirmed') {
    this.connection = connection;
    this.wallet = wallet;
    this.provider = new AnchorProvider(connection, wallet, {
      commitment,
      preflightCommitment: commitment,
    });
    this.program = new Program(IDL as any, this.provider);
  }

  async initializePlatform(): Promise<string> {
    const [platformPDA] = await getPlatformPDA();
    
    const tx = await this.program.methods
      .initializePlatform()
      .accounts({
        platform: platformPDA,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }

  async getPlatform(): Promise<Platform | null> {
    const [platformPDA] = await getPlatformPDA();
    try {
      const platform = await (this.program.account as any).platform.fetch(platformPDA);
      return platform as Platform;
    } catch {
      return null;
    }
  }

  async createWager(params: CreateWagerParams): Promise<string> {
    const platform = await this.getPlatform();
    if (!platform) throw new Error('Platform not initialized');

    const wagerId = platform.totalWagersCreated;
    const [wagerPDA] = await getWagerPDA(wagerId);
    const [yesMintPDA] = await getYesMintPDA(wagerPDA);
    const [noMintPDA] = await getNoMintPDA(wagerPDA);
    const [orderBookPDA] = await getOrderBookPDA(wagerPDA);
    const [vaultPDA] = await getVaultPDA(wagerPDA);
    const [platformPDA] = await getPlatformPDA();

    const tx = await this.program.methods
      .createWager(
        params.name,
        params.description,
        params.openingTime,
        params.closingTime,
        params.resolutionTime
      )
      .accounts({
        platform: platformPDA,
        wager: wagerPDA,
        yesMint: yesMintPDA,
        noMint: noMintPDA,
        orderBook: orderBookPDA,
        vault: vaultPDA,
        creator: this.wallet.publicKey,
        feeRecipient: platform.feeRecipient,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return tx;
  }

  async getWager(wagerId: BN): Promise<Wager | null> {
    const [wagerPDA] = await getWagerPDA(wagerId);
    try {
      const wager = await (this.program.account as any).wager.fetch(wagerPDA);
      return wager as Wager;
    } catch {
      return null;
    }
  }

  async depositAndMint(wagerId: BN, amount: BN): Promise<string> {
    const [wagerPDA] = await getWagerPDA(wagerId);
    const wager = await this.getWager(wagerId);
    if (!wager) throw new Error('Wager not found');

    const [yesMintPDA] = await getYesMintPDA(wagerPDA);
    const [noMintPDA] = await getNoMintPDA(wagerPDA);
    const [vaultPDA] = await getVaultPDA(wagerPDA);
    const [userPositionPDA] = await getUserPositionPDA(this.wallet.publicKey, wagerPDA);

    const userYesAccount = await getAssociatedTokenAddress(
      yesMintPDA,
      this.wallet.publicKey
    );
    const userNoAccount = await getAssociatedTokenAddress(
      noMintPDA,
      this.wallet.publicKey
    );

    const tx = await this.program.methods
      .depositAndMint(amount)
      .accounts({
        wager: wagerPDA,
        yesMint: yesMintPDA,
        noMint: noMintPDA,
        userYesAccount,
        userNoAccount,
        userPosition: userPositionPDA,
        vault: vaultPDA,
        user: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async placeOrder(params: PlaceOrderParams): Promise<string> {
    const [wagerPDA] = await getWagerPDA(params.wagerId);
    const wager = await this.getWager(params.wagerId);
    if (!wager) throw new Error('Wager not found');

    const [orderBookPDA] = await getOrderBookPDA(wagerPDA);
    const [userPositionPDA] = await getUserPositionPDA(this.wallet.publicKey, wagerPDA);
    const [escrowPDA] = await getEscrowPDA(wagerPDA, this.wallet.publicKey);

    const mint = params.tokenType === TokenType.Yes ? wager.yesMint : wager.noMint;
    const userTokenAccount = await getAssociatedTokenAddress(
      mint,
      this.wallet.publicKey
    );

    const tx = await this.program.methods
      .placeOrder(params.side, params.tokenType, params.price, params.quantity)
      .accounts({
        wager: wagerPDA,
        orderBook: orderBookPDA,
        userPosition: userPositionPDA,
        userTokenAccount,
        escrowAccount: escrowPDA,
        user: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async cancelOrder(wagerId: BN, orderId: BN): Promise<string> {
    const [wagerPDA] = await getWagerPDA(wagerId);
    const wager = await this.getWager(wagerId);
    if (!wager) throw new Error('Wager not found');

    const [orderBookPDA] = await getOrderBookPDA(wagerPDA);
    const [escrowPDA] = await getEscrowPDA(wagerPDA, this.wallet.publicKey);
    
    // This is simplified - in reality we'd need to determine the token type
    const userTokenAccount = await getAssociatedTokenAddress(
      wager.yesMint,
      this.wallet.publicKey
    );

    const tx = await this.program.methods
      .cancelOrder(orderId)
      .accounts({
        wager: wagerPDA,
        orderBook: orderBookPDA,
        userTokenAccount,
        escrowAccount: escrowPDA,
        user: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  async quickBuy(params: QuickBuyParams): Promise<string> {
    const [platformPDA] = await getPlatformPDA();
    const platform = await this.getPlatform();
    if (!platform) throw new Error('Platform not initialized');

    const [wagerPDA] = await getWagerPDA(params.wagerId);
    const wager = await this.getWager(params.wagerId);
    if (!wager) throw new Error('Wager not found');

    const [orderBookPDA] = await getOrderBookPDA(wagerPDA);
    const [userPositionPDA] = await getUserPositionPDA(this.wallet.publicKey, wagerPDA);

    const mint = params.tokenType === TokenType.Yes ? wager.yesMint : wager.noMint;
    const userTokenAccount = await getAssociatedTokenAddress(
      mint,
      this.wallet.publicKey
    );

    const tx = await this.program.methods
      .quickBuy(params.tokenType, params.solAmount, params.minTokensOut)
      .accounts({
        platform: platformPDA,
        wager: wagerPDA,
        orderBook: orderBookPDA,
        userPosition: userPositionPDA,
        userTokenAccount,
        user: this.wallet.publicKey,
        platformFeeRecipient: platform.feeRecipient,
        creatorFeeRecipient: wager.creator,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async resolveWager(wagerId: BN, resolution: Resolution): Promise<string> {
    const [platformPDA] = await getPlatformPDA();
    const [wagerPDA] = await getWagerPDA(wagerId);

    const tx = await this.program.methods
      .resolveWager(resolution)
      .accounts({
        platform: platformPDA,
        wager: wagerPDA,
        authority: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async claimWinnings(wagerId: BN): Promise<string> {
    const [wagerPDA] = await getWagerPDA(wagerId);
    const wager = await this.getWager(wagerId);
    if (!wager) throw new Error('Wager not found');

    const [yesMintPDA] = await getYesMintPDA(wagerPDA);
    const [noMintPDA] = await getNoMintPDA(wagerPDA);
    const [vaultPDA] = await getVaultPDA(wagerPDA);
    const [userPositionPDA] = await getUserPositionPDA(this.wallet.publicKey, wagerPDA);

    const userYesAccount = await getAssociatedTokenAddress(
      yesMintPDA,
      this.wallet.publicKey
    );
    const userNoAccount = await getAssociatedTokenAddress(
      noMintPDA,
      this.wallet.publicKey
    );

    const tx = await this.program.methods
      .claimWinnings()
      .accounts({
        wager: wagerPDA,
        userPosition: userPositionPDA,
        userYesAccount,
        userNoAccount,
        yesMint: yesMintPDA,
        noMint: noMintPDA,
        vault: vaultPDA,
        user: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async getOrderBook(wagerId: BN): Promise<OrderBook | null> {
    const [wagerPDA] = await getWagerPDA(wagerId);
    const [orderBookPDA] = await getOrderBookPDA(wagerPDA);
    try {
      const orderBook = await (this.program.account as any).orderBook.fetch(orderBookPDA);
      return orderBook as OrderBook;
    } catch {
      return null;
    }
  }

  async getUserPosition(wagerId: BN, user?: PublicKey): Promise<UserPosition | null> {
    const userPubkey = user || this.wallet.publicKey;
    const [wagerPDA] = await getWagerPDA(wagerId);
    const [userPositionPDA] = await getUserPositionPDA(userPubkey, wagerPDA);
    try {
      const userPosition = await (this.program.account as any).userPosition.fetch(userPositionPDA);
      return userPosition as UserPosition;
    } catch {
      return null;
    }
  }

  async getAllWagers(): Promise<Wager[]> {
    const wagers = await (this.program.account as any).wager.all();
    return wagers.map((w: any) => w.account as Wager);
  }

  async getActiveWagers(): Promise<Wager[]> {
    const wagers = await this.getAllWagers();
    return wagers.filter(w => w.status === WagerStatus.Active);
  }

  async getUserWagers(creator: PublicKey): Promise<Wager[]> {
    const wagers = await (this.program.account as any).wager.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: creator.toBase58(),
        },
      },
    ]);
    return wagers.map((w: any) => w.account as Wager);
  }

  /**
   * Match compatible orders in the order book
   */
  async matchOrders(wagerId: BN, maxIterations: number = 10): Promise<string> {
    const [wager] = getWagerPDA(wagerId);
    const [platform] = getPlatformPDA();
    const [orderBook] = getOrderBookPDA(wagerId);
    const [yesEscrow] = getEscrowPDA(wagerId, TokenType.Yes);
    const [noEscrow] = getEscrowPDA(wagerId, TokenType.No);

    const tx = await this.program.methods
      .matchOrders(maxIterations)
      .accounts({
        platform,
        wager,
        orderBook,
        yesEscrow,
        noEscrow,
        matcher: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const signature = await this.provider.sendAndConfirm(tx);
    await confirmTransaction(this.connection, signature);
    return signature;
  }
}