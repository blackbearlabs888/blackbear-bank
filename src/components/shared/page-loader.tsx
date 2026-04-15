'use client';

import { useState, useEffect } from 'react';

interface PageLoaderProps {
  logoUrl?: string | null;
  siteTitle?: string;
}

export default function PageLoader({ logoUrl, siteTitle = 'Black Bear' }: PageLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Get initials from site title for fallback
  const initials = siteTitle
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // If there's a logo image, wait for it to load before starting dismiss timer
  // Otherwise use a shorter timer
  useEffect(() => {
    const showImage = logoUrl && !imgError;

    if (showImage && !imgLoaded) {
      // Wait for image to load, with a max timeout of 3s
      const imgTimeout = setTimeout(() => {
        setImgLoaded(true); // force proceed even if image fails to load
      }, 3000);
      return () => clearTimeout(imgTimeout);
    }

    // Once image is loaded (or no image needed), wait before hiding
    const delay = showImage ? 1200 : 800;
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [logoUrl, imgError, imgLoaded]);

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
              className="w-full h-full object-contain"
              onLoad={() => setImgLoaded(true)}
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
