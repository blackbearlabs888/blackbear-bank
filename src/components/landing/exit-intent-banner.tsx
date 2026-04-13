'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Zap, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ExitIntentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const lastScrollY = useRef(0);
  const hasShown = useRef(false);

  useEffect(() => {
    // Only show once per session, after user has scrolled down at least 50% then scrolls back up
    const onScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollY / docHeight : 0;

      // Detect rapid upward scroll after reaching 50%+ depth
      if (
        !hasShown.current &&
        scrollPercent > 0.5 &&
        scrollY < lastScrollY.current - 100 &&
        lastScrollY.current > docHeight * 0.5
      ) {
        setIsVisible(true);
        hasShown.current = true;
      }

      lastScrollY.current = scrollY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Butuh bantuan?</p>
            <p className="text-xs text-muted-foreground">Kami siap membantu Anda via WhatsApp</p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1 h-9 gradient-primary text-white text-xs rounded-lg">
            <Link href="/order">
              <Zap className="w-3 h-3" />
              Order Sekarang
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-lg">
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-3 h-3" />
              Chat WA
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
