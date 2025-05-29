'use client';

import { useParams } from 'next/navigation';
import { NavBar } from '@/components/NavBar';

export default function WagerDetailPage() {
  const params = useParams();
  const wagerId = params?.id as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Wager Details
        </h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">
            Wager #{wagerId}
          </h2>
          <p className="text-gray-600">
            Detailed wager view is under development. This will show the full 
            market information, order book, and trading interface.
          </p>
        </div>
      </div>
    </div>
  );
}