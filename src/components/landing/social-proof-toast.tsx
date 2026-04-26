'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, X } from 'lucide-react';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

const fakeOrders = [
  { name: 'R***', city: 'Jakarta', amount: 'Rp 5.000.000', time: '2 menit lalu', method: 'BCA' },
  { name: 'A****', city: 'Surabaya', amount: 'Rp 3.500.000', time: '5 menit lalu', method: 'Mandiri' },
  { name: 'D***', city: 'Bandung', amount: 'Rp 8.000.000', time: '3 menit lalu', method: 'BNI' },
  { name: 'S***', city: 'Medan', amount: 'Rp 2.100.000', time: '7 menit lalu', method: 'BRI' },
  { name: 'M****', city: 'Semarang', amount: 'Rp 6.500.000', time: '1 menit lalu', method: 'Shopee Paylater' },
  { name: 'B***', city: 'Makassar', amount: 'Rp 4.200.000', time: '4 menit lalu', method: 'Permata' },
  { name: 'T***', city: 'Yogyakarta', amount: 'Rp 7.800.000', time: '6 menit lalu', method: 'CIMB' },
  { name: 'J***', city: 'Denpasar', amount: 'Rp 3.800.000', time: '2 menit lalu', method: 'GoPay Paylater' },
  { name: 'H***', city: 'Bekasi', amount: 'Rp 9.200.000', time: '8 menit lalu', method: 'BCA' },
  { name: 'K***', city: 'Tangerang', amount: 'Rp 1.800.000', time: '10 menit lalu', method: 'Panin' },
  { name: 'W***', city: 'Depok', amount: 'Rp 5.500.000', time: '3 menit lalu', method: 'BRI' },
  { name: 'P***', city: 'Palembang', amount: 'Rp 4.600.000', time: '6 menit lalu', method: 'Mandiri' },
];

// Only show on public pages: landing, blog, lokasi, FAQ
function isPublicPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/' ||
    pathname === '/faq' ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/lokasi')
  );
}

export default function SocialProofToast() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(fakeOrders[0]);
  const [isDismissed, setIsDismissed] = useState(false);
  const cookieBannerVisible = useCookieBannerVisible();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Only show on public pages
  const isPublic = isPublicPage(pathname);

  // Dynamic bottom position based on cookie banner
  const toastBottomMobile = cookieBannerVisible
    ? 'bottom-[17rem]'      // above cookie banner on mobile
    : 'bottom-24';           // above mobile nav
  const toastBottomDesktop = cookieBannerVisible
    ? 'md:bottom-[16rem]'    // above cookie banner on desktop
    : 'md:bottom-8';         // normal desktop

  const showNotification = useCallback(() => {
    if (isDismissed) return;

    let nextOrder;
    do {
      nextOrder = fakeOrders[Math.floor(Math.random() * fakeOrders.length)];
    } while (nextOrder.name === currentOrder.name && fakeOrders.length > 1);

    setCurrentOrder(nextOrder);
    setIsVisible(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  }, [isDismissed, currentOrder.name]);

  useEffect(() => {
    if (!isPublic) return;

    const initialTimer = setTimeout(() => {
      showNotification();
      intervalRef.current = setInterval(() => {
        showNotification();
      }, 22000);
    }, 5000);
    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showNotification, isPublic]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!isPublic || isDismissed) return null;
  if (!isVisible) return null;

  return (
    <>
      {/* Mobile: bottom-left popover */}
      <div
        className={`fixed ${toastBottomMobile} left-3 z-[61] max-w-[260px] md:hidden transition-all duration-500 ease-out animate-fade-in`}
      >
        <div className="relative bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-primary to-fuchsia-500" />
          <div className="p-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] font-bold text-foreground truncate">
                    Transaksi berhasil ✨
                  </p>
                  <button
                    onClick={() => setIsDismissed(true)}
                    className="text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted/50"
                    aria-label="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {currentOrder.name} dari {currentOrder.city}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-bold text-foreground tabular-nums">{currentOrder.amount}</span>
                  <span className="text-[9px] text-muted-foreground/50">•</span>
                  <span className="text-[9px] text-muted-foreground">{currentOrder.method}</span>
                </div>
                <p className="text-[9px] text-muted-foreground/40 mt-0.5">{currentOrder.time}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: bottom-left popover */}
      <div
        className={`hidden md:block fixed ${toastBottomDesktop} left-6 z-[61] w-[300px] transition-all duration-500 ease-out animate-fade-in`}
      >
        <div className="relative bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-primary to-fuchsia-500" />
          <div className="p-3.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground truncate">
                    Transaksi berhasil ✨
                  </p>
                  <button
                    onClick={() => setIsDismissed(true)}
                    className="text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted/50"
                    aria-label="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {currentOrder.name} dari {currentOrder.city}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-bold text-foreground tabular-nums">{currentOrder.amount}</span>
                  <span className="text-[10px] text-muted-foreground/50">•</span>
                  <span className="text-[10px] text-muted-foreground">{currentOrder.method}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/40 mt-0.5">{currentOrder.time}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
