'use client';

import { useState, useEffect } from 'react';

export default function PageLoader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Logo placeholder */}
      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-6 animate-pulse">
        <span className="text-white font-bold text-lg">B</span>
      </div>

      {/* Animated pulse bar */}
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
