// Type definitions for Wagers.bet

import { PublicKey, Connection } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';

// Enums
export enum WagerStatus {
  Created = 0,
  Active = 1,
  Resolved = 2,
}

export enum WagerResolution {
  Pending = 0,
  YesWon = 1,
  NoWon = 2,
  Draw = 3,
}

export enum OrderStatus {
  Active = 0,
  PartiallyFilled = 1,
  Filled = 2,
  Cancelled = 3,
}

// Account Types
export interface Platform {
  authority: PublicKey;
  deploymentFee: BN;
  tradingFeeBps: number;
  wagerCount: BN;
}

export interface Wager {
  authority: PublicKey;
  platform: PublicKey;
  name: string;
  description: string;
  openingTime: BN;
  conclusionTime: BN;
  conclusionDetails: string;
  yesMint: PublicKey;
  noMint: PublicKey;
  yesVault: PublicKey;
  noVault: PublicKey;
  solVault: PublicKey;
  status: WagerStatus;
  resolution: WagerResolution;
  index: BN;
}

export interface Order {
  id: BN;
  owner: PublicKey;
  wager: PublicKey;
  isBuy: boolean;
  isYesToken: boolean;
  price: BN;
  originalQuantity: BN;
  remainingQuantity: BN;
  status: OrderStatus;
  createdAt: BN;
}

export interface OrderBook {
  wager: PublicKey;
  nextOrderId: BN;
  activeOrdersCount: BN;
}

// Client Types
export interface WagerWithPubkey {
  publicKey: string;
  account: Wager;
}

export interface OrderWithPubkey {
  publicKey: string;
  account: Order;
}

export interface TokenBalances {
  yesBalance: number;
  noBalance: number;
}

export interface PositionCost {
  totalCost: number;
  effectivePrice: number;
  tokensReceived: number;
  priceImpact: number;
}

export interface CreateWagerResult {
  txSignature: string;
  wagerPDA: PublicKey;
  yesMintPDA: PublicKey;
  noMintPDA: PublicKey;
}

// Component Props
export interface WagerDetailsProps {
  wager: WagerWithPubkey;
  onDepositSol: (wager: WagerWithPubkey, amount: number) => void;
  onCreateOrder: (
    wager: WagerWithPubkey,
    orderBookPDA: PublicKey,
    isBuy: boolean,
    isYesToken: boolean,
    price: number,
    quantity: number
  ) => void;
  onCancelOrder: (
    orderPDA: PublicKey,
    orderBookPDA: PublicKey,
    wagerPDA: PublicKey,
    yesMintPDA: PublicKey,
    noMintPDA: PublicKey
  ) => void;
  onResolveWager: (wager: WagerWithPubkey, resolution: 0 | 1 | 2) => void;
  onClaimWinnings: (wager: WagerWithPubkey) => void;
  currentUserPubkey: string;
  client: any; // WagerBetClient
}

export interface QuickBuyProps {
  wager: WagerWithPubkey;
  client: any; // WagerBetClient
  onSuccess?: () => void;
}

export interface OrderBookProps {
  orders: OrderWithPubkey[];
  currentUserPubkey: string;
  onCancelOrder: (orderPDA: string) => void;
}

export interface MyBetsProps {
  wagers: WagerWithPubkey[];
  onViewWager: (wager: WagerWithPubkey) => void;
  currentUserPubkey: string;
  client: any; // WagerBetClient
}

export interface DashboardProps {
  wagers: WagerWithPubkey[];
  onViewWager: (wager: WagerWithPubkey) => void;
}

// Utility Types
export type Resolution = 'pending' | 'yes' | 'no' | 'draw';
export type OrderType = 'buy' | 'sell';
export type TokenType = 'yes' | 'no';

// Global Window Extensions
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect(): Promise<{ publicKey: PublicKey }>;
      disconnect(): Promise<void>;
      signTransaction(transaction: any): Promise<any>;
      signAllTransactions(transactions: any[]): Promise<any[]>;
    };
  }
}