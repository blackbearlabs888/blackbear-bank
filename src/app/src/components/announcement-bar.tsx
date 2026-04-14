'use client';

import { useState, useEffect } from 'react';
import { X, Zap, Gift, TrendingUp } from 'lucide-react';

const announcements = [
  { icon: Zap, text: 'Promo! Gestun Kartu Kredit mulai dari 1.5% — Terbatas!', color: 'text-primary' },
  { icon: Gift, text: 'Bonus cashback Rp50.000 untuk transaksi pertama Anda', color: 'text-fuchsia-500' },
  { icon: TrendingUp, text: 'Rate Paylater GoPay & Shopee termurah se-Indonesia', color: 'text-emerald-500' },
  { icon: Zap, text: 'Proses cepat 15-30 menit — Dana langsung cair ke rekening', color: 'text-primary' },
  { icon: Gift, text: 'Referral bonus: Ajak teman, dapat komisi Rp25.000/teman', color: 'text-amber-500' },
];

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const announcement = announcements[currentIndex];
  const Icon = announcement.icon;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-primary/8 to-fuchsia-500/5 border-b border-primary/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-10 gap-2.5">
          <div className="absolute left-4 sm:left-6">
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
              aria-label="Tutup pengumuman"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 animate-fade-in" key={currentIndex}>
            <Icon className={`w-4 h-4 flex-shrink-0 ${announcement.color}`} />
            <p className="text-sm font-medium text-foreground/80 whitespace-nowrap">
              {announcement.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
