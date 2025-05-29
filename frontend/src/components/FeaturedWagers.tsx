'use client';

import { useQuery } from '@tanstack/react-query';
import { WagerCard } from './WagerCard';
import { useConnection } from '@solana/wallet-adapter-react';
import { IpredictClient } from '@ipredict-xyz/sdk';
import { PublicKey } from '@solana/web3.js';

export function FeaturedWagers() {
  const { connection } = useConnection();

  const { data: wagers, isLoading } = useQuery({
    queryKey: ['featured-wagers'],
    queryFn: async () => {
      // Mock data for now - replace with actual SDK call
      return [
        {
          wagerId: '1',
          name: 'Will Bitcoin reach $100,000 by December 2025?',
          description: 'This market will resolve to YES if Bitcoin reaches $100,000 USD on any major exchange before December 31, 2025.',
          yesPrice: 0.35,
          noPrice: 0.65,
          volume: '125,000',
          closingTime: new Date('2025-12-31'),
          status: 'Active' as const,
        },
        {
          wagerId: '2',
          name: 'Will SpaceX successfully land on Mars by 2030?',
          description: 'Resolves YES if SpaceX successfully lands a crewed mission on Mars by December 31, 2030.',
          yesPrice: 0.22,
          noPrice: 0.78,
          volume: '87,500',
          closingTime: new Date('2030-12-31'),
          status: 'Active' as const,
        },
        {
          wagerId: '3',
          name: 'Will AGI be achieved by 2028?',
          description: 'This market resolves YES if artificial general intelligence is officially recognized by major AI research institutions.',
          yesPrice: 0.15,
          noPrice: 0.85,
          volume: '210,000',
          closingTime: new Date('2028-12-31'),
          status: 'Active' as const,
        },
      ];
    },
  });

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Markets</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Trade on the most popular prediction markets or create your own
          </p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wagers?.map((wager) => (
              <WagerCard key={wager.wagerId} wager={wager} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}