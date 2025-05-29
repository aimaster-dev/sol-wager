'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Clock, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WagerCardProps {
  wager: {
    wagerId: string;
    name: string;
    description: string;
    yesPrice: number;
    noPrice: number;
    volume: string;
    closingTime: Date;
    status: 'Active' | 'Resolved' | 'Created';
  };
}

export function WagerCard({ wager }: WagerCardProps) {
  const yesPercentage = Math.round(wager.yesPrice * 100);
  const noPercentage = Math.round(wager.noPrice * 100);

  return (
    <Link href={`/wager/${wager.wagerId}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 h-full flex flex-col">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
            {wager.name}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {wager.description}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-success-50 rounded-lg p-3">
              <div className="text-xs text-success-700 font-medium mb-1">YES</div>
              <div className="text-2xl font-bold text-success-800">{yesPercentage}¢</div>
              <div className="text-xs text-success-600">{yesPercentage}% chance</div>
            </div>
            
            <div className="bg-danger-50 rounded-lg p-3">
              <div className="text-xs text-danger-700 font-medium mb-1">NO</div>
              <div className="text-2xl font-bold text-danger-800">{noPercentage}¢</div>
              <div className="text-xs text-danger-600">{noPercentage}% chance</div>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>${wager.volume}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{format(wager.closingTime, 'MMM d, yyyy')}</span>
              </div>
            </div>
            
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              wager.status === 'Active' && 'bg-green-100 text-green-800',
              wager.status === 'Resolved' && 'bg-gray-100 text-gray-800',
              wager.status === 'Created' && 'bg-yellow-100 text-yellow-800'
            )}>
              {wager.status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}