// src/App.tsx
// Updated with proper client integration

import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Buffer } from 'buffer';
import { WagerBetClient } from './client/general-wager-bet-client';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import WagerCreationForm from './components/WagerCreationForm';
import WagerDetails from './components/WagerDetails';
import MyBets from './components/MyBets';
import { PROGRAM_ID, NETWORK } from './utils/constants';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Default styles for wallet adapter
require('@solana/wallet-adapter-react-ui/styles.css');

// Fix for Buffer issue in browser
window.Buffer = Buffer;

const App: React.FC = () => {
  // You can choose different networks here
  const network = NETWORK;
  
  // Initialize wallets
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
    new TorusWalletAdapter(),
  ];
  
  return (
    <ConnectionProvider endpoint={clusterApiUrl(network)}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WagerBetApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const WagerBetApp: React.FC = () => {
  const { wallet, publicKey, connected } = useWallet();
  const [client, setClient] = useState<WagerBetClient | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedWager, setSelectedWager] = useState<any>(null);
  const [wagers, setWagers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlatformInitialized, setIsPlatformInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const connection = new Connection(clusterApiUrl(NETWORK), 'confirmed');
  
  useEffect(() => {
    if (connected && wallet && publicKey) {
      // Initialize the client
      try {
        // @ts-ignore - wallet adapter types
        const newClient = new WagerBetClient(wallet.adapter, connection, PROGRAM_ID);
        setClient(newClient);
        
        // Check if platform is initialized and load wagers
        fetchPlatformData(newClient);
      } catch (error) {
        console.error('Error initializing client:', error);
        setError('Failed to initialize client. Please check your connection and try again.');
        setIsLoading(false);
      }
    } else {
      setClient(null);
      setWagers([]);
      setIsLoading(false);
    }
  }, [connected, wallet, publicKey, connection]);
  
  const fetchPlatformData = async (wagerClient: WagerBetClient) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if platform is initialized
      const platformPDA = await wagerClient.getPlatformPDA();
      
      if (platformPDA) {
        setIsPlatformInitialized(true);
        
        // Fetch all wagers
        const allWagers = await wagerClient.getAllWagers();
        setWagers(allWagers);
      } else {
        setIsPlatformInitialized(false);
        setWagers([]);
      }
    } catch (error) {
      console.error('Error fetching platform data:', error);
      setError('Failed to fetch platform data. The platform might not be initialized yet.');
      setIsPlatformInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInitializePlatform = async () => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.initializePlatform();
      setIsPlatformInitialized(true);
      await fetchPlatformData(client);
    } catch (error) {
      console.error('Error initializing platform:', error);
      setError('Failed to initialize platform. Please check your wallet balance and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateWager = async (wagerData: {
    name: string;
    description: string;
    openingTime: number;
    conclusionTime: number;
    conclusionDetails: string;
  }) => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createWager(
        wagerData.name,
        wagerData.description,
        wagerData.openingTime,
        wagerData.conclusionTime,
        wagerData.conclusionDetails
      );
      
      // Fetch updated wagers
      await fetchPlatformData(client);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Error creating wager:', error);
      setError('Failed to create wager. Please check your inputs and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewWager = (wager: any) => {
    setSelectedWager(wager);
    setCurrentView('wagerDetails');
  };
  
  const handleDepositSol = async (wager: any, amount: number) => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.depositSol(
        new PublicKey(wager.publicKey),
        new PublicKey(wager.account.yesMint),
        new PublicKey(wager.account.noMint),
        amount
      );
      
      // Refresh the wager details
      const updatedWager = await client.getWagerDetails(new PublicKey(wager.publicKey));
      setSelectedWager({
        publicKey: wager.publicKey,
        account: updatedWager
      });
    } catch (error) {
      console.error('Error depositing SOL:', error);
      setError('Failed to deposit SOL. Please check your wallet balance and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateOrder = async (
    wager: any,
    orderBookPDA: PublicKey,
    isBuy: boolean,
    isYesToken: boolean,
    price: number,
    quantity: number
  ) => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.createOrder(
        new PublicKey(wager.publicKey),
        orderBookPDA,
        new PublicKey(wager.account.yesMint),
        new PublicKey(wager.account.noMint),
        isBuy,
        isYesToken,
        price,
        quantity
      );
      
      // Refresh the wager details
      const updatedWager = await client.getWagerDetails(new PublicKey(wager.publicKey));
      setSelectedWager({
        publicKey: wager.publicKey,
        account: updatedWager
      });
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Failed to create order. Please check your inputs and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancelOrder = async (
    orderPDA: PublicKey,
    orderBookPDA: PublicKey,
    wagerPDA: PublicKey,
    yesMintPDA: PublicKey,
    noMintPDA: PublicKey
  ) => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.cancelOrder(
        orderPDA,
        orderBookPDA,
        wagerPDA,
        yesMintPDA,
        noMintPDA
      );
      
      // Refresh the wager details
      const updatedWager = await client.getWagerDetails(wagerPDA);
      setSelectedWager({
        publicKey: wagerPDA.toString(),
        account: updatedWager
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      setError('Failed to cancel order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResolveWager = async (wager: any, resolution: 0 | 1 | 2) => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.resolveWager(
        new PublicKey(wager.publicKey),
        resolution
      );
      
      // Refresh the wager details
      const updatedWager = await client.getWagerDetails(new PublicKey(wager.publicKey));
      setSelectedWager({
        publicKey: wager.publicKey,
        account: updatedWager
      });
    } catch (error) {
      console.error('Error resolving wager:', error);
      setError('Failed to resolve wager. Only the platform authority can resolve wagers.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClaimWinnings = async (wager: any) => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.claimWinnings(
        new PublicKey(wager.publicKey),
        new PublicKey(wager.account.yesMint),
        new PublicKey(wager.account.noMint)
      );
      
      // Refresh the wager details
      const updatedWager = await client.getWagerDetails(new PublicKey(wager.publicKey));
      setSelectedWager({
        publicKey: wager.publicKey,
        account: updatedWager
      });
    } catch (error) {
      console.error('Error claiming winnings:', error);
      setError('Failed to claim winnings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-6">
              <h1>General Wager Bet</h1>
            </div>
            <div className="col-6 text-end">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mt-4">
        {!connected ? (
          <div className="text-center py-5">
            <h2>Connect your wallet to get started</h2>
            <p>Use the button in the top right to connect your Solana wallet.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-danger mb-4" role="alert">
                {error}
                <button 
                  type="button" 
                  className="btn-close float-end" 
                  onClick={() => setError(null)}
                  aria-label="Close"
                />
              </div>
            )}
            
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {!isPlatformInitialized ? (
                  <div className="text-center py-5">
                    <h2>Platform needs to be initialized</h2>
                    <p>You need to initialize the platform before using it.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={handleInitializePlatform}
                    >
                      Initialize Platform
                    </button>
                  </div>
                ) : (
                  <>
                    <Navigation 
                      currentView={currentView}
                      setCurrentView={setCurrentView}
                    />
                    
                    {currentView === 'dashboard' && (
                      <Dashboard 
                        wagers={wagers}
                        onViewWager={handleViewWager}
                      />
                    )}
                    
                    {currentView === 'createWager' && (
                      <WagerCreationForm 
                        onSubmit={handleCreateWager}
                        onCancel={() => setCurrentView('dashboard')}
                      />
                    )}
                    
                    {currentView === 'wagerDetails' && selectedWager && client && (
                      <WagerDetails 
                        wager={selectedWager}
                        onDepositSol={handleDepositSol}
                        onCreateOrder={handleCreateOrder}
                        onCancelOrder={handleCancelOrder}
                        onResolveWager={handleResolveWager}
                        onClaimWinnings={handleClaimWinnings}
                        currentUserPubkey={publicKey?.toString() || ''}
                        client={client}
                      />
                    )}
                    
                    {currentView === 'myBets' && (
                      <MyBets 
                        wagers={wagers}
                        onViewWager={handleViewWager}
                        currentUserPubkey={publicKey?.toString() || ''}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
      
      <footer className="footer mt-auto py-3 bg-light">
        <div className="container text-center">
          <span className="text-muted">General Wager Bet © 2025</span>
        </div>
      </footer>
    </div>
  );
};

export default App;