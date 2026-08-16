'use client';

import { useState, useEffect } from 'react';

interface PageLoaderProps {
  logoUrl?: string | null;
  siteTitle?: string;
}

export default function PageLoader({ logoUrl, siteTitle = 'Black Bear' }: PageLoaderProps) {
  // Start hidden=false so the loader is visible during the very first paint
  // (avoids a flash of unstyled content / layout shift before React hydrates).
  // We dismiss it as soon as the page is interactive — we do NOT artificially
  // delay LCP. The loader is decorative and must never block the hero text.
  const [isVisible, setIsVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Get initials from site title for fallback
  const initials = siteTitle
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Only show the loader if the page is still loading after a tiny threshold
  // (250ms). This avoids showing the loader on fast navigations / cached pages
  // where LCP is already painted, while still covering slow first-loads.
  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    // If the document is already loaded (cached / fast nav), never show.
    if (document.readyState === 'complete') {
      return;
    }

    showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 250);

    // Dismiss as soon as the window fires `load` (HTML + critical assets done).
    // Fallback: force-dismiss at 1500ms regardless, so a stalled asset never
    // traps the user behind the loader.
    const dismiss = () => {
      if (showTimer) clearTimeout(showTimer);
      setIsVisible(false);
    };
    window.addEventListener('load', dismiss, { once: true });
    hideTimer = setTimeout(dismiss, 1500);

    return () => {
      window.removeEventListener('load', dismiss);
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const showImage = logoUrl && !imgError;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Logo */}
      {showImage ? (
        <div className="relative mb-6">
          {/* Subtle glow behind logo */}
          <div className="absolute inset-0 scale-150 blur-2xl bg-primary/15 rounded-full animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-border/50 shadow-lg shadow-primary/10 flex items-center justify-center bg-black p-1.5 dark:bg-muted">
            <img
              src={logoUrl}
              alt={siteTitle}
              width={80}
              height={80}
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          </div>
        </div>
      ) : (
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-primary/15">
          <span className="text-white font-bold text-2xl">{initials}</span>
        </div>
      )}

      {/* Site title text */}
      <p className="text-sm font-medium text-muted-foreground mb-4 tracking-wide">
        {siteTitle}
      </p>

      {/* Animated loading bar */}
      <div className="w-48 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary"
          style={{
            animation: 'pageLoaderBar 1.2s ease-in-out infinite',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes pageLoaderBar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
