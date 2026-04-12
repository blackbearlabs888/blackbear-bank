'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap, Truck } from 'lucide-react';

export default function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 500px (past hero section)
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Fade overlay */}
      <div className="absolute -top-8 inset-x-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* CTA Bar */}
      <div className="relative bg-background/95 backdrop-blur-lg border-t border-border/50 px-4 py-3 safe-area-bottom ios-safe-bottom">
        <div className="flex gap-3">
          <Button
            asChild
            className="flex-1 gradient-primary text-white rounded-xl h-12 text-sm font-semibold shadow-lg shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
          >
            <Link href="/order">
              <Zap className="w-4 h-4" />
              Order Sekarang
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 rounded-xl h-12 text-sm font-medium border-border/60 transition-all duration-300 active:scale-[0.98]"
          >
            <Link href="/track">
              <Truck className="w-4 h-4" />
              Track Order
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
