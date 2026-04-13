'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PageLoaderProps {
  logoUrl?: string | null;
  siteTitle?: string;
}

export default function PageLoader({ logoUrl, siteTitle = 'Black Bear' }: PageLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Get initials from site title for fallback
  const initials = siteTitle
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 800);
    return () => clearTimeout(timer);
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
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-border/50 shadow-lg shadow-primary/10 animate-pulse flex items-center justify-center bg-muted">
            <Image
              src={logoUrl}
              alt={siteTitle}
              fill
              className="object-contain p-1.5"
              priority
              onError={() => setImgError(true)}
            />
          </div>
        </div>
      ) : (
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-primary/15">
          <span className="text-white font-bold text-xl">{initials}</span>
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