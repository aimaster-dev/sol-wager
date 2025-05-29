'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { NavBar } from '@/components/NavBar';
import { Calendar, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateWagerPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    openingTime: '',
    closingTime: '',
    resolutionTime: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual wager creation using SDK
      toast.success('Wager created successfully!');
      router.push('/markets');
    } catch (error) {
      toast.error('Failed to create wager');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a New Market</h1>
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Market Question
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Will Bitcoin reach $100,000 by December 2025?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                maxLength={200}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.name.length}/200 characters
              </p>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description & Resolution Criteria
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="This market will resolve to YES if Bitcoin reaches $100,000 USD on any major exchange (Binance, Coinbase, Kraken) before December 31, 2025 at 11:59 PM UTC."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                maxLength={1000}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="openingTime" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Opening Time
                </label>
                <input
                  type="datetime-local"
                  id="openingTime"
                  name="openingTime"
                  value={formData.openingTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="closingTime" className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Closing Time
                </label>
                <input
                  type="datetime-local"
                  id="closingTime"
                  name="closingTime"
                  value={formData.closingTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="resolutionTime" className="block text-sm font-medium text-gray-700 mb-2">
                  <Info className="inline h-4 w-4 mr-1" />
                  Resolution Time
                </label>
                <input
                  type="datetime-local"
                  id="resolutionTime"
                  name="resolutionTime"
                  value={formData.resolutionTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Market Creation Fee</h3>
              <p className="text-sm text-blue-700">
                Creating a market requires a one-time fee of 1 SOL. This fee helps prevent spam and ensures quality markets.
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/markets')}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!connected || isSubmitting}
                className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Market'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}