import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

export const PLATFORM_SEED = 'platform';
export const WAGER_SEED = 'wager';
export const VAULT_SEED = 'vault';
export const ORDER_BOOK_SEED = 'order_book';
export const ORDER_SEED = 'order';
export const USER_POSITION_SEED = 'user_position';

export const TOKENS_PER_SOL = new BN(100);
export const LAMPORTS_PER_TOKEN = new BN(10_000_000); // 0.01 SOL
export const LAMPORTS_PER_SOL = new BN(1_000_000_000);
export const PLATFORM_FEE_BPS = 25; // 0.25%
export const DEPLOYER_FEE_BPS = 25; // 0.25%
export const TOTAL_FEE_BPS = 50; // 0.5%
export const BPS_DIVISOR = new BN(10_000);

export const MAX_NAME_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_ORDERS_PER_BOOK = 1000;

export const WAGER_CREATION_FEE = new BN(1_000_000_000); // 1 SOL