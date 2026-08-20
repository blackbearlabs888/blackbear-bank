'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

export default function ScrollToTop() {
  const [scrollPercent, setScrollPercent] = useState(0);
  const pathname = usePathname();
  const cookieBannerVisible = useCookieBannerVisible();

  // Don't show on dashboard/auth pages
  const isHiddenPage =
    pathname?.startsWith('/owner/') ||
    pathname?.startsWith('/partner/') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/maintenance');

  // Track scroll position via scroll event callback
  useEffect(() => {
    if (isHiddenPage) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            setScrollPercent(Math.min((scrollTop / docHeight) * 100, 100));
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname, isHiddenPage]);

  const isVisible = scrollPercent > 2;
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Cookie banner only renders on public pages, so only offset on those pages.
  // Mirror predicate must stay in sync with cookie-consent.tsx isPublicPage()
  // (SEO Batch 1 QA correction #1: include /pencairan-* pillar routes).
  const isPublicPage = pathname === '/' || pathname === '/faq' || pathname?.startsWith('/blog') || pathname?.startsWith('/lokasi') || pathname?.startsWith('/pencairan-');
  const shouldOffsetCookie = cookieBannerVisible && isPublicPage;

  // Align right with WA FAB: right-4 sm:right-5 md:right-6
  // Stack vertically above WA FAB with 16px gap
  // Mobile: FAB at bottom-24 (96px) + 52px height + 16px gap = 164px → bottom-40 (160px) ≈ bottom-[10.5rem]
  // Desktop: FAB at md:bottom-6 (24px) + 56px height + 16px gap = 96px → md:bottom-24 (96px)
  const btnBottom = shouldOffsetCookie
    ? 'bottom-[21rem]'       // above WA FAB when cookie visible on mobile
    : 'bottom-[10.5rem]';    // above WA FAB normally on mobile
  const btnBottomMd = shouldOffsetCookie
    ? 'md:bottom-[16.5rem]'  // above WA FAB when cookie visible on desktop
    : 'md:bottom-24';        // above WA FAB normally on desktop

  if (!isVisible || isHiddenPage) return null;

  // SVG progress ring calculations
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollPercent / 100) * circumference;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed z-[61] right-4 sm:right-5 md:right-6 ${btnBottom} ${btnBottomMd}
        w-11 h-11
        rounded-full
        bg-background/90 backdrop-blur-sm border border-border/60
        shadow-lg shadow-black/10
        flex items-center justify-center
        text-muted-foreground hover:text-primary
        hover:border-primary/30 hover:shadow-md hover:shadow-primary/10
        transition-all duration-300
        hover:-translate-y-0.5 active:scale-95`}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-4 h-4 relative z-10" />
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
          stroke="url(#scrollProgressGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-150 ease-out"
        />
        <defs>
          <linearGradient id="scrollProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}
