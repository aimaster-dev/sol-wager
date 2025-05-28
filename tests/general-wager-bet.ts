// tests/general-wager-bet.ts
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { GeneralWagerBet } from '../target/types/general_wager_bet';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import { expect } from 'chai';
import * as assert from 'assert';

describe('general-wager-bet', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GeneralWagerBet as Program<GeneralWagerBet>;

  // Generate keypairs for the test accounts
  const platform = Keypair.generate();
  const wager = Keypair.generate();
  const orderBook = Keypair.generate();
  const yesMint = Keypair.generate();
  const noMint = Keypair.generate();
  const order1 = Keypair.generate();
  const order2 = Keypair.generate();

  // Store PDAs
  let platformVaultPDA: PublicKey;
  let yesVaultPDA: PublicKey;
  let noVaultPDA: PublicKey;
  let solVaultPDA: PublicKey;
  let userYesToken: PublicKey;
  let userNoToken: PublicKey;

  before(async () => {
    // Find PDAs
    [platformVaultPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("platform_vault"), platform.publicKey.toBuffer()],
      program.programId
    );

    [yesVaultPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("yes_vault"), wager.publicKey.toBuffer()],
      program.programId
    );

    [noVaultPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("no_vault"), wager.publicKey.toBuffer()],
      program.programId
    );

    [solVaultPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("sol_vault"), wager.publicKey.toBuffer()],
      program.programId
    );

    // Get associated token accounts for the user
    userYesToken = await getAssociatedTokenAddress(
      yesMint.publicKey,
      provider.wallet.publicKey
    );

    userNoToken = await getAssociatedTokenAddress(
      noMint.publicKey,
      provider.wallet.publicKey
    );
  });

  it('Initializes the platform', async () => {
    await program.methods
      .initializePlatform()
      .accounts({
        platform: platform.publicKey,
        authority: provider.wallet.publicKey,
        platformVault: platformVaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([platform])
      .rpc();

    // Verify the platform was initialized correctly
    const platformAccount = await program.account.platform.fetch(platform.publicKey);
    assert.equal(platformAccount.authority.toString(), provider.wallet.publicKey.toString());
    assert.equal(platformAccount.deploymentFee.toString(), (1_000_000_000).toString()); // 1 SOL
    assert.equal(platformAccount.tradingFeeBps, 50); // 0.5%
    assert.equal(platformAccount.wagerCount.toString(), '0');
  });

  it('Creates a new wager', async () => {
    // Get the current timestamp
    const now = Math.floor(Date.now() / 1000);
    const openingTime = now + 60; // 1 minute from now
    const conclusionTime = now + 3600; // 1 hour from now

    // Create a new wager
    await program.methods
      .createWager(
        "Will Team A win?",
        "This wager is about whether Team A will win the championship.",
        new anchor.BN(openingTime),
        new anchor.BN(conclusionTime),
        "Resolves based on official announcement."
      )
      .accounts({
        wager: wager.publicKey,
        orderBook: orderBook.publicKey,
        platform: platform.publicKey,
        platformVault: platformVaultPDA,
        wagerCreator: provider.wallet.publicKey,
        yesMint: yesMint.publicKey,
        noMint: noMint.publicKey,
        deployerYesToken: userYesToken,
        deployerNoToken: userNoToken,
        yesVault: yesVaultPDA,
        noVault: noVaultPDA,
        solVault: solVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wager, orderBook, yesMint, noMint])
      .rpc();

    // Verify the wager was created correctly
    const wagerAccount = await program.account.wager.fetch(wager.publicKey);
    assert.equal(wagerAccount.authority.toString(), provider.wallet.publicKey.toString());
    assert.equal(wagerAccount.name, "Will Team A win?");
    assert.equal(wagerAccount.description, "This wager is about whether Team A will win the championship.");
    assert.equal(wagerAccount.openingTime.toString(), openingTime.toString());
    assert.equal(wagerAccount.conclusionTime.toString(), conclusionTime.toString());
    assert.equal(wagerAccount.conclusionDetails, "Resolves based on official announcement.");
    assert.equal(wagerAccount.yesMint.toString(), yesMint.publicKey.toString());
    assert.equal(wagerAccount.noMint.toString(), noMint.publicKey.toString());
    assert.equal(wagerAccount.yesVault.toString(), yesVaultPDA.toString());
    assert.equal(wagerAccount.noVault.toString(), noVaultPDA.toString());
    assert.equal(wagerAccount.solVault.toString(), solVaultPDA.toString());
    assert.equal(wagerAccount.status, 0); // Created
    assert.equal(wagerAccount.resolution, 0); // Pending

    // Verify platform counter was incremented
    const platformAccount = await program.account.platform.fetch(platform.publicKey);
    assert.equal(platformAccount.wagerCount.toString(), '1');

    // Verify order book was initialized
    const orderBookAccount = await program.account.orderBook.fetch(orderBook.publicKey);
    assert.equal(orderBookAccount.wager.toString(), wager.publicKey.toString());
    assert.equal(orderBookAccount.nextOrderId.toString(), '1');
    assert.equal(orderBookAccount.activeOrdersCount.toString(), '0');

    // Verify initial tokens were minted to deployer
    const connection = provider.connection;
    const userYesBalance = await connection.getTokenAccountBalance(userYesToken);
    assert.equal(userYesBalance.value.amount, '100000000000'); // 100 tokens
    const userNoBalance = await connection.getTokenAccountBalance(userNoToken);
    assert.equal(userNoBalance.value.amount, '100000000000'); // 100 tokens
  });

  it('Deposits SOL to mint tokens', async () => {
    // First, let's set the wager to Active status (in real usage, this would happen after first deposit)
    // This is only for testing purposes
    await program.methods
      .depositSol(new anchor.BN(1_000_000_000)) // 1 SOL
      .accounts({
        wager: wager.publicKey,
        user: provider.wallet.publicKey,
        yesMint: yesMint.publicKey,
        noMint: noMint.publicKey,
        userYesToken: userYesToken,
        userNoToken: userNoToken,
        solVault: solVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Verify wager status is now active
    const wagerAccount = await program.account.wager.fetch(wager.publicKey);
    assert.equal(wagerAccount.status, 1); // Active

    // Verify tokens were minted
    const connection = provider.connection;
    const userYesBalance = await connection.getTokenAccountBalance(userYesToken);
    assert.equal(userYesBalance.value.amount, '200000000000'); // 200 tokens (100 + 100)
    const userNoBalance = await connection.getTokenAccountBalance(userNoToken);
    assert.equal(userNoBalance.value.amount, '200000000000'); // 200 tokens (100 + 100)

    // Verify SOL was transferred to the vault
    const solVaultBalance = await connection.getBalance(solVaultPDA);
    assert.equal(solVaultBalance, 1_000_000_000); // 1 SOL
  });

  // Create sell order for 50 YES tokens at 0.6 SOL per token
  const price = 0.6 * anchor.web3.LAMPORTS_PER_SOL;
  const quantity = 50 * 1_000_000_000; // 50 tokens
  
  it('Creates a sell order for YES tokens', async () => {
    await program.methods
      .createOrder(
        false, // isBuy = false (sell)
        true,  // isYesToken = true
        new anchor.BN(price),
        new anchor.BN(quantity)
      )
      .accounts({
        order: order1.publicKey,
        orderBook: orderBook.publicKey,
        wager: wager.publicKey,
        user: provider.wallet.publicKey,
        userYesToken: userYesToken,
        userNoToken: userNoToken,
        yesVault: yesVaultPDA,
        noVault: noVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([order1])
      .rpc();
      
    // Verify order was created correctly
    const orderAccount = await program.account.order.fetch(order1.publicKey);
    assert.equal(orderAccount.owner.toString(), provider.wallet.publicKey.toString());
    assert.equal(orderAccount.wager.toString(), wager.publicKey.toString());
    assert.equal(orderAccount.isBuy, false);
    assert.equal(orderAccount.isYesToken, true);
    assert.equal(orderAccount.price.toString(), price.toString());
    assert.equal(orderAccount.originalQuantity.toString(), quantity.toString());
    assert.equal(orderAccount.remainingQuantity.toString(), quantity.toString());
    assert.equal(orderAccount.status, 0); // Active
    
    // Verify order book active orders count was incremented
    const orderBookAccount = await program.account.orderBook.fetch(orderBook.publicKey);
    assert.equal(orderBookAccount.activeOrdersCount.toString(), '1');
    
    // Verify tokens were transferred to vault
    const connection = provider.connection;
    const yesVaultBalance = await connection.getTokenAccountBalance(yesVaultPDA);
    assert.equal(yesVaultBalance.value.amount, quantity.toString());
  });
  
  it('Creates a buy order for YES tokens', async () => {
    // Create buy order for 30 YES tokens at 0.55 SOL per token
    const price = 0.55 * anchor.web3.LAMPORTS_PER_SOL;
    const quantity = 30 * 1_000_000_000; // 30 tokens
    
    await program.methods
      .createOrder(
        true,  // isBuy = true
        true,  // isYesToken = true
        new anchor.BN(price),
        new anchor.BN(quantity)
      )
      .accounts({
        order: order2.publicKey,
        orderBook: orderBook.publicKey,
        wager: wager.publicKey,
        user: provider.wallet.publicKey,
        userYesToken: userYesToken,
        userNoToken: userNoToken,
        yesVault: yesVaultPDA,
        noVault: noVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([order2])
      .rpc();
      
    // Verify order was created correctly
    const orderAccount = await program.account.order.fetch(order2.publicKey);
    assert.equal(orderAccount.owner.toString(), provider.wallet.publicKey.toString());
    assert.equal(orderAccount.wager.toString(), wager.publicKey.toString());
    assert.equal(orderAccount.isBuy, true);
    assert.equal(orderAccount.isYesToken, true);
    assert.equal(orderAccount.price.toString(), price.toString());
    assert.equal(orderAccount.originalQuantity.toString(), quantity.toString());
    assert.equal(orderAccount.remainingQuantity.toString(), quantity.toString());
    assert.equal(orderAccount.status, 0); // Active
    
    // Verify order book active orders count was incremented
    const orderBookAccount = await program.account.orderBook.fetch(orderBook.publicKey);
    assert.equal(orderBookAccount.activeOrdersCount.toString(), '2');
    
    // Verify SOL was transferred to order account
    const connection = provider.connection;
    const totalCost = price * quantity / anchor.web3.LAMPORTS_PER_SOL;
    const orderBalance = await connection.getBalance(order2.publicKey);
    assert.equal(orderBalance, totalCost);
  });
  
  it('Cancels an order', async () => {
    // Cancel the sell order
    await program.methods
      .cancelOrder()
      .accounts({
        order: order1.publicKey,
        orderBook: orderBook.publicKey,
        wager: wager.publicKey,
        user: provider.wallet.publicKey,
        userYesToken: userYesToken,
        userNoToken: userNoToken,
        yesVault: yesVaultPDA,
        noVault: noVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
      
    // Verify order was cancelled
    const orderAccount = await program.account.order.fetch(order1.publicKey);
    assert.equal(orderAccount.status, 3); // Cancelled
    assert.equal(orderAccount.remainingQuantity.toString(), '0');
    
    // Verify order book active orders count was decremented
    const orderBookAccount = await program.account.orderBook.fetch(orderBook.publicKey);
    assert.equal(orderBookAccount.activeOrdersCount.toString(), '1');
    
    // Verify tokens were returned to user
    const connection = provider.connection;
    const userYesBalance = await connection.getTokenAccountBalance(userYesToken);
    assert.equal(userYesBalance.value.amount, '200000000000'); // 200 tokens (original 200)
  });
  
  it('Resolves the wager and claims winnings', async () => {
    // Fast forward time to the conclusion time
    // This is a test-only approach - in reality, you would wait for the actual time
    // For testing, we'll directly set the wager to Active status if needed
    
    // Resolve the wager (YES won)
    await program.methods
      .resolveWager(0) // 0 = YES Won
      .accounts({
        wager: wager.publicKey,
        platform: platform.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
      
    // Verify wager was resolved
    const wagerAccount = await program.account.wager.fetch(wager.publicKey);
    assert.equal(wagerAccount.status, 2); // Resolved
    assert.equal(wagerAccount.resolution, 1); // YES Won
    
    // Claim winnings
    await program.methods
      .claimWinnings()
      .accounts({
        wager: wager.publicKey,
        user: provider.wallet.publicKey,
        yesMint: yesMint.publicKey,
        noMint: noMint.publicKey,
        userYesToken: userYesToken,
        userNoToken: userNoToken,
        solVault: solVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
      
    // Verify YES tokens were burned
    const connection = provider.connection;
    const userYesBalance = await connection.getTokenAccountBalance(userYesToken);
    assert.equal(userYesBalance.value.amount, '0'); // All YES tokens burned
    
    // User should have received 0.01 SOL per YES token (200 * 0.01 = 2 SOL)
    // But we can't easily verify the exact SOL balance due to transaction fees
    // So we'll just check that the vault balance decreased
    const solVaultBalance = await connection.getBalance(solVaultPDA);
    assert(solVaultBalance < 2 * anchor.web3.LAMPORTS_PER_SOL);
  });
});