import { Hero } from '@/components/Hero';
import { FeaturedWagers } from '@/components/FeaturedWagers';
import { HowItWorks } from '@/components/HowItWorks';
import { NavBar } from '@/components/NavBar';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavBar />
      <Hero />
      <FeaturedWagers />
      <HowItWorks />
    </main>
  );
}