import { PublicKey, Connection, Commitment } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import BN from 'bn.js';
import {
  PLATFORM_SEED,
  WAGER_SEED,
  VAULT_SEED,
  ORDER_BOOK_SEED,
  USER_POSITION_SEED,
  PROGRAM_ID,
  LAMPORTS_PER_TOKEN,
  TOKENS_PER_SOL,
  LAMPORTS_PER_SOL,
} from './constants';

export const getPlatformPDA = async (): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from(PLATFORM_SEED)],
    PROGRAM_ID
  );
};

export const getWagerPDA = async (wagerId: BN): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from(WAGER_SEED), wagerId.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  );
};

export const getVaultPDA = async (wager: PublicKey): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from(VAULT_SEED), wager.toBuffer()],
    PROGRAM_ID
  );
};

export const getOrderBookPDA = async (wager: PublicKey): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from(ORDER_BOOK_SEED), wager.toBuffer()],
    PROGRAM_ID
  );
};

export const getUserPositionPDA = async (
  user: PublicKey,
  wager: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from(USER_POSITION_SEED), user.toBuffer(), wager.toBuffer()],
    PROGRAM_ID
  );
};

export const getYesMintPDA = async (wager: PublicKey): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from('yes_mint'), wager.toBuffer()],
    PROGRAM_ID
  );
};

export const getNoMintPDA = async (wager: PublicKey): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from('no_mint'), wager.toBuffer()],
    PROGRAM_ID
  );
};

export const getEscrowPDA = async (
  wager: PublicKey,
  user: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from('escrow'), wager.toBuffer(), user.toBuffer()],
    PROGRAM_ID
  );
};

export const solToLamports = (sol: number): BN => {
  return new BN(sol * LAMPORTS_PER_SOL.toNumber());
};

export const lamportsToSol = (lamports: BN): number => {
  return lamports.toNumber() / LAMPORTS_PER_SOL.toNumber();
};

export const tokensToSol = (tokens: BN): number => {
  return tokens.mul(LAMPORTS_PER_TOKEN).toNumber() / LAMPORTS_PER_SOL.toNumber();
};

export const solToTokens = (sol: number): BN => {
  return new BN(sol).mul(TOKENS_PER_SOL);
};

export const calculateTokenPrice = (priceInLamports: BN): number => {
  return priceInLamports.toNumber() / LAMPORTS_PER_TOKEN.toNumber();
};

export const calculateFee = (amount: BN, feeBps: number): BN => {
  return amount.mul(new BN(feeBps)).div(new BN(10000));
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const confirmTransaction = async (
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed'
): Promise<void> => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  }, commitment);
};