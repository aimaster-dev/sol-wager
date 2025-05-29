export class IpredictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpredictError';
  }
}

export const ErrorMessages = {
  InvalidTimeParameters: 'Invalid time parameters',
  WagerNotOpen: 'Wager not yet open',
  WagerClosed: 'Wager already closed',
  WagerAlreadyResolved: 'Wager already resolved',
  WagerNotResolvable: 'Wager not yet resolvable',
  InvalidResolution: 'Invalid resolution',
  InvalidOrderPrice: 'Invalid order price',
  InvalidOrderQuantity: 'Invalid order quantity',
  OrderBookFull: 'Order book full',
  OrderNotFound: 'Order not found',
  Unauthorized: 'Unauthorized',
  InsufficientBalance: 'Insufficient balance',
  SlippageExceeded: 'Slippage exceeded',
  InvalidTokenType: 'Invalid token type',
  NameTooLong: 'Name too long',
  DescriptionTooLong: 'Description too long',
  MathOverflow: 'Math overflow',
  InvalidFee: 'Invalid fee',
};