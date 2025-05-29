'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavBar } from '@/components/NavBar';
import { WagerCard } from '@/components/WagerCard';
import { Search, Filter, TrendingUp } from 'lucide-react';

export default function MarketsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved'>('all');

  const { data: wagers, isLoading } = useQuery({
    queryKey: ['all-wagers', searchTerm, filterStatus],
    queryFn: async () => {
      // Mock data - replace with actual SDK call
      const allWagers = [
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
        {
          wagerId: '4',
          name: 'Will the 2024 Olympics break viewership records?',
          description: 'Resolves YES if the 2024 Paris Olympics exceeds the previous record of 3.6 billion viewers.',
          yesPrice: 0.45,
          noPrice: 0.55,
          volume: '45,000',
          closingTime: new Date('2024-09-01'),
          status: 'Resolved' as const,
        },
      ];

      // Filter by status
      let filtered = allWagers;
      if (filterStatus !== 'all') {
        filtered = filtered.filter(w => 
          w.status.toLowerCase() === filterStatus
        );
      }

      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter(w =>
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return filtered;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">All Markets</h1>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('resolved')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'resolved'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : wagers && wagers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wagers.map((wager) => (
              <WagerCard key={wager.wagerId} wager={wager} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No markets found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}