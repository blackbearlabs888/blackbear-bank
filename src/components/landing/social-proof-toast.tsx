'use client';
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

const fakeOrders = [
  { name: 'R***', city: 'Jakarta', amount: 'Rp 5.000.000', time: '2 menit lalu' },
  { name: 'A****', city: 'Surabaya', amount: 'Rp 3.500.000', time: '5 menit lalu' },
  { name: 'D***', city: 'Bandung', amount: 'Rp 8.000.000', time: '3 menit lalu' },
  { name: 'S***', city: 'Medan', amount: 'Rp 2.000.000', time: '7 menit lalu' },
  { name: 'M****', city: 'Semarang', amount: 'Rp 6.500.000', time: '1 menit lalu' },
  { name: 'B***', city: 'Makassar', amount: 'Rp 4.200.000', time: '4 menit lalu' },
  { name: 'T***', city: 'Yogyakarta', amount: 'Rp 7.800.000', time: '6 menit lalu' },
  { name: 'J***', city: 'Denpasar', amount: 'Rp 3.800.000', time: '2 menit lalu' },
];

export default function SocialProofToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(fakeOrders[0]);
  const [isDismissed, setIsDismissed] = useState(false);
  const cookieBannerVisible = useCookieBannerVisible();

  const showNotification = useCallback(() => {
    if (isDismissed || cookieBannerVisible) return;
    const randomOrder = fakeOrders[Math.floor(Math.random() * fakeOrders.length)];
    setCurrentOrder(randomOrder);
    setIsVisible(true);
    setTimeout(() => setIsVisible(false), 4000);
  }, [isDismissed, cookieBannerVisible]);

  useEffect(() => {
    // First notification after 8 seconds
    const initialTimer = setTimeout(() => {
      showNotification();
      // Then every 15-25 seconds
      const interval = setInterval(() => {
        showNotification();
      }, 20000);
      return () => clearInterval(interval);
    }, 8000);
    return () => clearTimeout(initialTimer);
  }, [showNotification]);

  // Don't render when cookie banner is visible
  if (!isVisible || cookieBannerVisible) return null;

  return (
    <div
      className={`fixed bottom-20 left-4 z-50 max-w-xs transition-all duration-500 md:hidden ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start gap-3 bg-background border border-border/60 rounded-xl shadow-lg p-3 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">
            {currentOrder.name} dari {currentOrder.city}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Order gestun {currentOrder.amount}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{currentOrder.time}</p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted/50"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
