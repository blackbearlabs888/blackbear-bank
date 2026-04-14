'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Zap, Gift, TrendingUp, Megaphone, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  type: string;
  link?: string | null;
}

interface AnnouncementBarProps {
  announcements: AnnouncementItem[];
}

const iconMap: Record<string, typeof Zap> = {
  promo: Gift,
  broadcast: Megaphone,
  announcement: Zap,
};
const colorMap: Record<string, string> = {
  promo: 'text-fuchsia-500',
  broadcast: 'text-amber-500',
  announcement: 'text-primary',
};
const bgMap: Record<string, string> = {
  promo: 'bg-fuchsia-500/10',
  broadcast: 'bg-amber-500/10',
  announcement: 'bg-primary/10',
};

export default function AnnouncementBar({ announcements }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const items = announcements.length > 0 ? announcements : [];

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (!isVisible || items.length === 0) return null;

  const item = items[currentIndex];
  const Icon = iconMap[item.type] || Zap;
  const color = colorMap[item.type] || 'text-primary';
  const bg = bgMap[item.type] || 'bg-primary/10';

  return (
    <div className="announcement-shimmer bg-gradient-to-r from-primary/8 via-primary/10 to-fuchsia-500/8 border-b border-primary/10 dark:from-primary/15 dark:via-primary/20 dark:to-fuchsia-500/15 dark:border-primary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center h-10 sm:h-11 gap-2.5">
          {/* Close button — left aligned */}
          <div className="absolute left-1 sm:left-3 z-10">
            <button
              onClick={handleClose}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50 min-h-0 min-w-0"
              aria-label="Tutup pengumuman"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Animated announcement */}
          <div className="flex items-center gap-2 animate-fade-in max-w-[calc(100%-56px)] sm:max-w-none" key={currentIndex}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon className={`w-3 h-3 ${color}`} />
            </div>
            <p className="text-[11px] sm:text-sm font-medium text-foreground/80 truncate">
              {item.title}
            </p>
            {item.link && (
              <Link
                href={item.link}
                className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors flex-shrink-0"
              >
                Lihat
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Dots indicator — right side on desktop */}
          {items.length > 1 && (
            <div className="absolute right-1 sm:right-3 hidden sm:flex items-center gap-1">
              {items.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-4 h-1.5 bg-primary'
                      : 'w-1.5 h-1.5 bg-muted-foreground/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
