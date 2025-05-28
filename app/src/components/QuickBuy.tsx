import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { WagerBetClient } from '../client/general-wager-bet-client';
import { formatSol, formatTokenAmount } from '../utils/format';

interface QuickBuyProps {
  wager: any;
  client: WagerBetClient | null;
  onSuccess?: () => void;
}

const QuickBuy: React.FC<QuickBuyProps> = ({ wager, client, onSuccess }) => {
  const [solAmount, setSolAmount] = useState<string>('1');
  const [selectedOption, setSelectedOption] = useState<'yes' | 'no' | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<{
    totalCost: number;
    effectivePrice: number;
    tokensReceived: number;
    priceImpact: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate price whenever amount or option changes
  useEffect(() => {
    const calculatePrice = async () => {
      if (!client || !selectedOption || !solAmount || parseFloat(solAmount) <= 0) {
        setPriceInfo(null);
        return;
      }

      try {
        const wagerPDA = new PublicKey(wager.publicKey);
        const info = await client.calculatePositionCost(
          wagerPDA,
          selectedOption === 'yes',
          parseFloat(solAmount)
        );
        setPriceInfo(info);
      } catch (err) {
        console.error('Error calculating price:', err);
        setPriceInfo(null);
      }
    };

    calculatePrice();
  }, [client, selectedOption, solAmount, wager.publicKey]);

  const handleBuy = async () => {
    if (!client || !selectedOption || !priceInfo) return;

    setLoading(true);
    setError(null);

    try {
      const wagerPDA = new PublicKey(wager.publicKey);
      const txId = await client.buyPosition(
        wagerPDA,
        selectedOption === 'yes',
        parseFloat(solAmount)
      );

      console.log('Transaction successful:', txId);
      if (onSuccess) onSuccess();
      
      // Reset form
      setSolAmount('1');
      setSelectedOption(null);
      setPriceInfo(null);
    } catch (err: any) {
      console.error('Error buying position:', err);
      setError(err.message || 'Failed to buy position');
    } finally {
      setLoading(false);
    }
  };

  const getPriceImpactColor = (impact: number) => {
    if (Math.abs(impact) < 2) return 'text-success';
    if (Math.abs(impact) < 5) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="quick-buy-container">
      <h4 className="mb-4">Quick Buy Position</h4>
      
      {/* Option Selection */}
      <div className="mb-4">
        <label className="form-label">Select Your Position</label>
        <div className="btn-group w-100" role="group">
          <button
            type="button"
            className={`btn btn-lg ${selectedOption === 'yes' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setSelectedOption('yes')}
          >
            <i className="bi bi-check-circle-fill me-2"></i>
            YES
          </button>
          <button
            type="button"
            className={`btn btn-lg ${selectedOption === 'no' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setSelectedOption('no')}
          >
            <i className="bi bi-x-circle-fill me-2"></i>
            NO
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="form-label">Investment Amount (SOL)</label>
        <div className="input-group">
          <input
            type="number"
            className="form-control form-control-lg"
            value={solAmount}
            onChange={(e) => setSolAmount(e.target.value)}
            min="0.1"
            step="0.1"
            placeholder="Enter SOL amount"
          />
          <span className="input-group-text">SOL</span>
        </div>
        <small className="text-muted">
          Minimum: 0.1 SOL
        </small>
      </div>

      {/* Price Preview */}
      {priceInfo && selectedOption && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Order Preview</h5>
            <div className="row">
              <div className="col-6">
                <small className="text-muted">You will receive:</small>
                <div className="h4">
                  {formatTokenAmount(priceInfo.tokensReceived * 1_000_000_000)} {selectedOption.toUpperCase()}
                </div>
              </div>
              <div className="col-6">
                <small className="text-muted">Effective price:</small>
                <div className="h4">
                  {formatSol(priceInfo.effectivePrice * 1_000_000_000)} SOL
                </div>
              </div>
            </div>
            
            <hr />
            
            <div className="row">
              <div className="col-6">
                <small className="text-muted">Total cost:</small>
                <div>{formatSol(priceInfo.totalCost * 1_000_000_000)} SOL</div>
              </div>
              <div className="col-6">
                <small className="text-muted">Price impact:</small>
                <div className={getPriceImpactColor(priceInfo.priceImpact)}>
                  {priceInfo.priceImpact > 0 ? '+' : ''}{priceInfo.priceImpact.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="mt-3">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Your {selectedOption === 'yes' ? 'NO' : 'YES'} tokens will be automatically sold on the order book
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Buy Button */}
      <button
        className="btn btn-primary btn-lg w-100"
        onClick={handleBuy}
        disabled={!selectedOption || !priceInfo || loading || parseFloat(solAmount) <= 0}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Processing...
          </>
        ) : (
          <>
            <i className="bi bi-lightning-charge-fill me-2"></i>
            Buy {selectedOption?.toUpperCase() || 'Position'}
          </>
        )}
      </button>

      {/* Help Text */}
      <div className="mt-3 text-center">
        <small className="text-muted">
          This will deposit SOL, mint tokens, and automatically trade for your desired position
        </small>
      </div>
    </div>
  );
};

export default QuickBuy;