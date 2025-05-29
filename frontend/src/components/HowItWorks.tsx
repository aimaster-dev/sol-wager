'use client';

import { Wallet, Coins, TrendingUp, Trophy } from 'lucide-react';

const steps = [
  {
    icon: Wallet,
    title: 'Connect Your Wallet',
    description: 'Connect your Solana wallet to start trading. We support Phantom, Solflare, and more.',
  },
  {
    icon: Coins,
    title: 'Deposit & Mint Tokens',
    description: 'Deposit SOL to mint equal amounts of YES and NO tokens for any market.',
  },
  {
    icon: TrendingUp,
    title: 'Trade Your Position',
    description: 'Buy or sell YES/NO tokens based on your predictions. Set your own prices or use Quick Buy.',
  },
  {
    icon: Trophy,
    title: 'Claim Your Winnings',
    description: 'When markets resolve, winning tokens can be redeemed for 0.01 SOL each.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get started with prediction markets in just a few simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-200 -translate-x-1/2">
                    <div className="absolute right-0 top-1/2 w-2 h-2 bg-gray-300 rounded-full -translate-y-1/2 translate-x-1/2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}