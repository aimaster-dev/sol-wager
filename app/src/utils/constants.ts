// src/utils/constants.ts
// Constants for the application

import { PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Program ID
export const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

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