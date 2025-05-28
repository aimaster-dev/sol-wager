import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';
import QuickBuy from './QuickBuy';
import { WagerBetClient } from '../client/general-wager-bet-client';

// Mock the client
jest.mock('../client/general-wager-bet-client');

describe('QuickBuy Component', () => {
  const mockWager = {
    publicKey: '11111111111111111111111111111111',
    account: {
      name: 'Test Wager',
      status: 1, // Active
    }
  };

  const mockClient = {
    calculatePositionCost: jest.fn(),
    buyPosition: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component correctly', () => {
    render(<QuickBuy wager={mockWager} client={mockClient as any} />);
    
    expect(screen.getByText('Quick Buy Position')).toBeInTheDocument();
    expect(screen.getByText('YES')).toBeInTheDocument();
    expect(screen.getByText('NO')).toBeInTheDocument();
  });

  it('calculates price when YES is selected', async () => {
    mockClient.calculatePositionCost.mockResolvedValue({
      totalCost: 1,
      effectivePrice: 0.01,
      tokensReceived: 100,
      priceImpact: 0,
    });

    render(<QuickBuy wager={mockWager} client={mockClient as any} />);
    
    fireEvent.click(screen.getByText('YES'));
    
    await waitFor(() => {
      expect(mockClient.calculatePositionCost).toHaveBeenCalledWith(
        expect.any(PublicKey),
        true,
        1
      );
    });
  });

  it('executes buy position when form is submitted', async () => {
    mockClient.calculatePositionCost.mockResolvedValue({
      totalCost: 1,
      effectivePrice: 0.01,
      tokensReceived: 100,
      priceImpact: 0,
    });
    mockClient.buyPosition.mockResolvedValue('tx-id');

    render(<QuickBuy wager={mockWager} client={mockClient as any} />);
    
    fireEvent.click(screen.getByText('YES'));
    fireEvent.change(screen.getByPlaceholderText('Enter SOL amount'), {
      target: { value: '2' }
    });
    
    await waitFor(() => {
      expect(screen.getByText('Buy YES')).toBeEnabled();
    });
    
    fireEvent.click(screen.getByText('Buy YES'));
    
    await waitFor(() => {
      expect(mockClient.buyPosition).toHaveBeenCalledWith(
        expect.any(PublicKey),
        true,
        2
      );
    });
  });

  it('shows error message on transaction failure', async () => {
    mockClient.calculatePositionCost.mockResolvedValue({
      totalCost: 1,
      effectivePrice: 0.01,
      tokensReceived: 100,
      priceImpact: 0,
    });
    mockClient.buyPosition.mockRejectedValue(new Error('Transaction failed'));

    render(<QuickBuy wager={mockWager} client={mockClient as any} />);
    
    fireEvent.click(screen.getByText('NO'));
    fireEvent.click(screen.getByText('Buy NO'));
    
    await waitFor(() => {
      expect(screen.getByText(/Transaction failed/)).toBeInTheDocument();
    });
  });

  it('disables buy button when no option is selected', () => {
    render(<QuickBuy wager={mockWager} client={mockClient as any} />);
    
    expect(screen.getByText('Buy Position')).toBeDisabled();
  });

  it('shows price impact warning for high impact', async () => {
    mockClient.calculatePositionCost.mockResolvedValue({
      totalCost: 1.5,
      effectivePrice: 0.015,
      tokensReceived: 100,
      priceImpact: 50,
    });

    render(<QuickBuy wager={mockWager} client={mockClient as any} />);
    
    fireEvent.click(screen.getByText('YES'));
    
    await waitFor(() => {
      const priceImpact = screen.getByText(/\+50\.00%/);
      expect(priceImpact).toHaveClass('text-danger');
    });
  });
});