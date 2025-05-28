// src/components/WagerDetails.tsx
// Updated with real API calls and token balances

import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import OrderBook from './OrderBook';
import QuickBuy from './QuickBuy';
import { 
  formatSol, 
  formatTokenAmount, 
  formatDate, 
  getStatusClass, 
  getResolutionClass,
  getWagerStatusText,
  getWagerResolutionText 
} from '../utils/format';
import { WagerStatus, WagerResolution } from '../utils/constants';

interface WagerDetailsProps {
  wager: any;
  onDepositSol: (wager: any, amount: number) => void;
  onCreateOrder: (
    wager: any,
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
  onResolveWager: (wager: any, resolution: 0 | 1 | 2) => void;
  onClaimWinnings: (wager: any) => void;
  currentUserPubkey: string;
  client: any; // WagerBetClient
}

const WagerDetails: React.FC<WagerDetailsProps> = ({
  wager,
  onDepositSol,
  onCreateOrder,
  onCancelOrder,
  onResolveWager,
  onClaimWinnings,
  currentUserPubkey,
  client
}) => {
  const [depositAmount, setDepositAmount] = useState<number>(1);
  const [yesBalance, setYesBalance] = useState<number>(0);
  const [noBalance, setNoBalance] = useState<number>(0);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [tokenType, setTokenType] = useState<'yes' | 'no'>('yes');
  const [orderPrice, setOrderPrice] = useState<number>(0.5);
  const [orderQuantity, setOrderQuantity] = useState<number>(10);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderBookPDA, setOrderBookPDA] = useState<PublicKey | null>(null);
  const [isPlatformAuthority, setIsPlatformAuthority] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptionIds, setSubscriptionIds] = useState<number[]>([]);
  
  // Fetch user token balances and orders
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Get token balances
        const balances = await client.getUserTokenBalances(
          new PublicKey(currentUserPubkey),
          new PublicKey(wager.account.yesMint),
          new PublicKey(wager.account.noMint)
        );
        
        setYesBalance(balances.yesBalance);
        setNoBalance(balances.noBalance);
        
        // Get order book PDA
        const orderBookPDA = await client.getOrderBookPDA(
          new PublicKey(wager.publicKey)
        );
        
        setOrderBookPDA(orderBookPDA);
        
        // Get orders for this wager
        const orders = await client.getOrdersForWager(
          new PublicKey(wager.publicKey)
        );
        
        setOrders(orders);
        
        // Check if current user is platform authority
        const platform = await client.getPlatformPDA();
        if (platform) {
          const platformAccount = await client.program.account.platform.fetch(platform);
          setIsPlatformAuthority(platformAccount.authority.toString() === currentUserPubkey);
        }
        
        // Set up subscriptions for real-time updates
        const wagerSubscriptionId = client.subscribeToWagerUpdates(
          new PublicKey(wager.publicKey),
          (account: any) => {
            // Update wager status
            wager.account = account;
          }
        );
        
        const orderBookSubscriptionId = client.subscribeToOrderBookUpdates(
          orderBookPDA,
          async () => {
            // Refresh orders when order book changes
            const updatedOrders = await client.getOrdersForWager(
              new PublicKey(wager.publicKey)
            );
            setOrders(updatedOrders);
          }
        );
        
        setSubscriptionIds([wagerSubscriptionId, orderBookSubscriptionId]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Cleanup subscriptions on unmount
    return () => {
      subscriptionIds.forEach(id => {
        if (id) client.unsubscribe(id);
      });
    };
  }, [wager, currentUserPubkey, client]);
  
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmount > 0) {
      onDepositSol(wager, depositAmount);
    }
  };
  
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderBookPDA && orderPrice > 0 && orderQuantity > 0) {
      onCreateOrder(
        wager,
        orderBookPDA,
        orderType === 'buy',
        tokenType === 'yes',
        orderPrice,
        orderQuantity
      );
    }
  };
  
  const handleCancelOrder = (orderPDA: string) => {
    if (orderBookPDA) {
      onCancelOrder(
        new PublicKey(orderPDA),
        orderBookPDA,
        new PublicKey(wager.publicKey),
        new PublicKey(wager.account.yesMint),
        new PublicKey(wager.account.noMint)
      );
    }
  };
  
  const handleResolve = (resolution: 0 | 1 | 2) => {
    onResolveWager(wager, resolution);
  };
  
  const handleClaimWinnings = () => {
    onClaimWinnings(wager);
  };
  
  const isWagerActive = wager.account.status === WagerStatus.Active;
  const isWagerResolved = wager.account.status === WagerStatus.Resolved;
  const isWagerOpen = isWagerActive && 
                      Date.now() / 1000 >= wager.account.openingTime &&
                      Date.now() / 1000 < wager.account.conclusionTime;
  const isWagerConcluded = Date.now() / 1000 >= wager.account.conclusionTime;
  const canResolve = isPlatformAuthority && isWagerActive && isWagerConcluded;
  const canClaimWinnings = isWagerResolved && 
                           ((wager.account.resolution === WagerResolution.YesWon && yesBalance > 0) || 
                            (wager.account.resolution === WagerResolution.NoWon && noBalance > 0) ||
                            (wager.account.resolution === WagerResolution.Draw && (yesBalance > 0 || noBalance > 0)));
  
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="wager-details">
      <h2>{wager.account.name}</h2>
      
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <h5 className="card-title">Details</h5>
              <p className="card-text">{wager.account.description}</p>
              
              <div className="mb-3">
                <strong>Status:</strong>{' '}
                <span className={`badge ${getStatusClass(wager.account.status)}`}>
                  {getWagerStatusText(wager.account.status)}
                </span>
                {isWagerResolved && (
                  <span className={`ms-2 badge ${getResolutionClass(wager.account.resolution)}`}>
                    {getWagerResolutionText(wager.account.resolution)}
                  </span>
                )}
              </div>
              
              <div className="mb-3">
                <strong>Opening Time:</strong> {formatDate(wager.account.openingTime)}
              </div>
              
              <div className="mb-3">
                <strong>Conclusion Time:</strong> {formatDate(wager.account.conclusionTime)}
              </div>
              
              <div className="mb-3">
                <strong>Conclusion Details:</strong> {wager.account.conclusionDetails}
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Your Position</h5>
                  
                  <div className="mb-2">
                    <strong>YES Tokens:</strong> {formatTokenAmount(yesBalance)}
                  </div>
                  
                  <div className="mb-3">
                    <strong>NO Tokens:</strong> {formatTokenAmount(noBalance)}
                  </div>
                  
                  {canClaimWinnings && (
                    <button 
                      className="btn btn-success w-100"
                      onClick={handleClaimWinnings}
                    >
                      Claim Winnings
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {!isWagerResolved && isWagerOpen && (
            <div className="mt-4">
              <ul className="nav nav-tabs" id="tradingTabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button 
                    className="nav-link active" 
                    id="quick-buy-tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#quick-buy" 
                    type="button" 
                    role="tab"
                  >
                    <i className="bi bi-lightning-charge-fill me-2"></i>
                    Quick Buy
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className="nav-link" 
                    id="advanced-tab" 
                    data-bs-toggle="tab" 
                    data-bs-target="#advanced" 
                    type="button" 
                    role="tab"
                  >
                    <i className="bi bi-graph-up me-2"></i>
                    Advanced Trading
                  </button>
                </li>
              </ul>
              
              <div className="tab-content border border-top-0 p-4" id="tradingTabsContent">
                <div className="tab-pane fade show active" id="quick-buy" role="tabpanel">
                  <div className="row">
                    <div className="col-md-8 offset-md-2">
                      <QuickBuy 
                        wager={wager} 
                        client={client}
                        onSuccess={() => {
                          // Refresh token balances
                          if (client) {
                            client.getUserTokenBalances(
                              new PublicKey(currentUserPubkey),
                              new PublicKey(wager.account.yesMint),
                              new PublicKey(wager.account.noMint)
                            ).then(balances => {
                              setYesBalance(balances.yesBalance);
                              setNoBalance(balances.noBalance);
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="tab-pane fade" id="advanced" role="tabpanel">
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <h5>Deposit SOL</h5>
                      <form onSubmit={handleDepositSubmit}>
                        <div className="input-group mb-3">
                          <input 
                            type="number"
                            className="form-control"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(Number(e.target.value))}
                            min="0.1"
                            step="0.1"
                          />
                          <span className="input-group-text">SOL</span>
                          <button 
                            className="btn btn-primary" 
                            type="submit"
                            disabled={!isWagerActive}
                          >
                            Deposit
                          </button>
                        </div>
                        <small className="form-text text-muted">
                          You'll receive {depositAmount * 100} YES and {depositAmount * 100} NO tokens
                        </small>
                      </form>
                    </div>
                    
                    <div className="col-md-6">
                      <h5>Place Order</h5>
                      <form onSubmit={handleOrderSubmit}>
                    <div className="mb-3">
                      <div className="btn-group w-100">
                        <button 
                          type="button" 
                          className={`btn ${orderType === 'buy' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setOrderType('buy')}
                        >
                          Buy
                        </button>
                        <button 
                          type="button" 
                          className={`btn ${orderType === 'sell' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setOrderType('sell')}
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="btn-group w-100">
                        <button 
                          type="button" 
                          className={`btn ${tokenType === 'yes' ? 'btn-success' : 'btn-outline-success'}`}
                          onClick={() => setTokenType('yes')}
                        >
                          YES Token
                        </button>
                        <button 
                          type="button" 
                          className={`btn ${tokenType === 'no' ? 'btn-danger' : 'btn-outline-danger'}`}
                          onClick={() => setTokenType('no')}
                        >
                          NO Token
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Price (SOL per token)</label>
                      <input 
                        type="number"
                        className="form-control"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(Number(e.target.value))}
                        min="0.001"
                        max="1"
                        step="0.001"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Quantity (tokens)</label>
                      <input 
                        type="number"
                        className="form-control"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(Number(e.target.value))}
                        min="1"
                        step="1"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <strong>Total:</strong> {(orderPrice * orderQuantity).toFixed(3)} SOL
                    </div>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary w-100"
                      disabled={orderType === 'sell' && 
                                ((tokenType === 'yes' && yesBalance < orderQuantity) || 
                                 (tokenType === 'no' && noBalance < orderQuantity))}
                    >
                      Place Order
                    </button>
                    
                    {orderType === 'sell' && 
                     ((tokenType === 'yes' && yesBalance < orderQuantity) || 
                      (tokenType === 'no' && noBalance < orderQuantity)) && (
                      <div className="text-danger mt-2">
                        Insufficient token balance
                      </div>
                    )}
                  </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {canResolve && (
            <div className="mt-4">
              <h5>Resolve Wager</h5>
              <div className="btn-group">
                <button 
                  className="btn btn-success"
                  onClick={() => handleResolve(0)}
                >
                  YES Won
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleResolve(1)}
                >
                  NO Won
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleResolve(2)}
                >
                  Draw
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <h3>Order Book</h3>
      <OrderBook 
        orders={orders}
        currentUserPubkey={currentUserPubkey}
        onCancelOrder={handleCancelOrder}
      />
    </div>
  );
};

export default WagerDetails;