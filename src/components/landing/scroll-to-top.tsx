'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const cookieBannerVisible = useCookieBannerVisible();
  const hasInit = useRef(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            setScrollPercent(Math.min((scrollTop / docHeight) * 100, 100));
          }
          if (!hasInit.current) {
            hasInit.current = true;
          }
          setIsVisible(scrollTop > 600);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hide when cookie banner is visible on mobile
  if (!isVisible) return null;
  if (cookieBannerVisible) return null;

  // SVG progress ring calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollPercent / 100) * circumference;

  return (
    <button
      onClick={scrollToTop}
      className="fixed z-40
        bottom-24 right-4
        md:bottom-8 md:right-6
        w-10 h-10 md:w-11 md:h-11
        rounded-full
        bg-background/90 backdrop-blur-sm border border-border/60
        shadow-lg shadow-black/10
        flex items-center justify-center
        text-muted-foreground hover:text-primary
        hover:border-primary/30 hover:shadow-md hover:shadow-primary/10
        transition-all duration-300
        hover:-translate-y-0.5 active:scale-95
        animate-fade-in"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-4 h-4 md:w-[18px] md:h-[18px] relative z-10" />
      {/* Progress ring */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
        viewBox="0 0 44 44"
      >
        {/* Track circle */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-border/30"
        />
        {/* Progress circle */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-150 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}
