'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowRight, TrendingUp, Users, Shield } from 'lucide-react';

export function Hero() {
  const { connected } = useWallet();

  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Predict the Future,
            <span className="text-primary-600"> Profit from Truth</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create and trade on the outcomes of any future event. 
            Decentralized, permissionless, and powered by Solana.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href={connected ? '/markets' : '#'}
              className="inline-flex items-center justify-center px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              {connected ? 'Explore Markets' : 'Connect Wallet to Start'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg border-2 border-primary-600 hover:bg-primary-50 transition-colors"
            >
              Create a Market
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Markets</h3>
              <p className="text-gray-600 text-sm">
                Trade on live events with instant settlement on Solana
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">User-Created</h3>
              <p className="text-gray-600 text-sm">
                Anyone can create markets on any topic, no approval needed
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fully Decentralized</h3>
              <p className="text-gray-600 text-sm">
                On-chain order book with no centralized components
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-transparent to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
      </div>
    </section>
  );
}