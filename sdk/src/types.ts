import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export enum WagerStatus {
  Created = 'Created',
  Active = 'Active',
  Resolved = 'Resolved',
}

export enum Resolution {
  Pending = 'Pending',
  YesWon = 'YesWon',
  NoWon = 'NoWon',
  Draw = 'Draw',
}

export enum TokenType {
  Yes = 'Yes',
  No = 'No',
}

export enum OrderSide {
  Buy = 'Buy',
  Sell = 'Sell',
}

export enum ResolutionArbitrator {
  Platform = 'Platform',
  AI = 'AI',
  DAO = 'DAO',
}

export interface Platform {
  authority: PublicKey;
  feeRecipient: PublicKey;
  totalWagersCreated: BN;
  totalVolumeTraded: BN;
  totalFeesCollected: BN;
  platformFeeBps: number;
  deployerFeeBps: number;
  wagerCreationFee: BN;
  bump: number;
}

export interface Wager {
  creator: PublicKey;
  name: string;
  description: string;
  yesMint: PublicKey;
  noMint: PublicKey;
  vault: PublicKey;
  orderBook: PublicKey;
  openingTime: BN;
  closingTime: BN;
  resolutionTime: BN;
  status: WagerStatus;
  resolution: Resolution;
  resolutionArbitrator: ResolutionArbitrator;
  totalYesTokens: BN;
  totalNoTokens: BN;
  totalSolDeposited: BN;
  totalVolumeTraded: BN;
  totalFeesCollected: BN;
  wagerId: BN;
  bump: number;
}

export interface Order {
  id: BN;
  owner: PublicKey;
  side: OrderSide;
  tokenType: TokenType;
  price: BN;
  quantity: BN;
  filledQuantity: BN;
  timestamp: BN;
}

export interface OrderBook {
  wager: PublicKey;
  nextOrderId: BN;
  buyOrdersYes: Order[];
  sellOrdersYes: Order[];
  buyOrdersNo: Order[];
  sellOrdersNo: Order[];
  bump: number;
}

export interface UserPosition {
  user: PublicKey;
  wager: PublicKey;
  yesTokensBought: BN;
  yesTokensSold: BN;
  noTokensBought: BN;
  noTokensSold: BN;
  totalSolDeposited: BN;
  totalSolWithdrawn: BN;
  winningsClaimed: boolean;
  bump: number;
}

export interface CreateWagerParams {
  name: string;
  description: string;
  openingTime: BN;
  closingTime: BN;
  resolutionTime: BN;
}

export interface PlaceOrderParams {
  wagerId: BN;
  side: OrderSide;
  tokenType: TokenType;
  price: BN;
  quantity: BN;
}

export interface QuickBuyParams {
  wagerId: BN;
  tokenType: TokenType;
  solAmount: BN;
  minTokensOut: BN;
}