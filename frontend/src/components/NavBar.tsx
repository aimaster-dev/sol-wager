'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';

export function NavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/markets', label: 'Markets' },
    { href: '/create', label: 'Create Wager' },
    { href: '/portfolio', label: 'Portfolio' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">i</span>
              </div>
              <span className="font-bold text-xl">Predict XYZ</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary-600',
                    pathname === item.href
                      ? 'text-primary-600'
                      : 'text-gray-600'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
        </div>
      </div>
    </nav>
  );
}