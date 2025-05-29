'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { NavBar } from '@/components/NavBar';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function PortfolioPage() {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-gray-600 mb-8">
              Please connect your wallet to view your portfolio.
            </p>
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Portfolio</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Portfolio Coming Soon</h2>
          <p className="text-gray-600">
            This feature is under development. You'll be able to view your positions, 
            trading history, and earnings here.
          </p>
        </div>
      </div>
    </div>
  );
}