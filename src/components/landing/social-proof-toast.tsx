'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, X, ArrowRight, Sparkles } from 'lucide-react';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

// Phase 4: ILLUSTRATIVE sample orders. These are not real notifications.
// The toast title is explicitly labeled "Contoh Ilustrasi" so users are
// never misled into thinking these are live verified transactions.
const sampleOrders = [
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

function isPublicPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/' || pathname === '/faq' || pathname.startsWith('/blog') || pathname.startsWith('/lokasi');
}

function getRandomOrder(excludeName: string) {
  let next: (typeof sampleOrders)[number];
  do {
    next = sampleOrders[Math.floor(Math.random() * sampleOrders.length)];
  } while (next.name === excludeName && sampleOrders.length > 1);
  return next;
}

function getInitials(name: string) {
  return name.replace(/[\*]/g, '').charAt(0);
}

const avatarGradients = [
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
];

const SHOW_MS = 5000;
const EXIT_MS = 400;
const ENTER_MS = 450;

function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export default function SocialProofToast() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');
  const [currentOrder, setCurrentOrder] = useState(sampleOrders[0]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(100);
  const cookieBannerVisible = useCookieBannerVisible();

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const isPublic = isPublicPage(pathname);

  const toastBottomMobile = cookieBannerVisible ? 'bottom-[17rem]' : 'bottom-24';
  const toastBottomDesktop = cookieBannerVisible ? 'md:bottom-[16rem]' : 'md:bottom-8';

  // Timer management
  const clearAllTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  };

  const pushTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); };

  // Handle dismiss
  const handleDismiss = () => {
    setPhase('exiting');
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    pushTimer(setTimeout(() => {
      setIsDismissed(true);
      setPhase('hidden');
    }, 400));
  };

  // Main lifecycle effect — self-contained async cycle
  useEffect(() => {
    if (!isPublic || isDismissed) {
      clearAllTimers();
      return;
    }
    clearAllTimers();

    let cancelled = false;
    let lastName = currentOrder.name;

    const startProgress = () => {
      setProgress(100);
      if (progressRef.current) clearInterval(progressRef.current);
      const step = 50;
      const dec = (step / SHOW_MS) * 100;
      progressRef.current = setInterval(() => {
        setProgress(prev => {
          const next = prev - dec;
          if (next <= 0) {
            if (progressRef.current) clearInterval(progressRef.current);
            return 0;
          }
          return next;
        });
      }, step);
    };

    const runCycle = async () => {
      if (cancelled) return;

      // FADE IN
      const order = getRandomOrder(lastName);
      lastName = order.name;
      setCurrentOrder(order);
      setPhase('entering');
      startProgress();

      await wait(ENTER_MS);
      if (cancelled) return;
      setPhase('visible');

      await wait(SHOW_MS);
      if (cancelled) return;

      // FADE OUT
      setPhase('exiting');
      if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }

      await wait(EXIT_MS);
      if (cancelled) return;
      setPhase('hidden');
    };

    // Start first cycle after 5s, then loop every 17s
    const initialT = setTimeout(async () => {
      await runCycle();
      const loopT = setInterval(async () => {
        await runCycle();
      }, 17000);
      pushTimer(loopT as unknown as ReturnType<typeof setTimeout>);
    }, 5000);
    pushTimer(initialT);

    return () => {
      cancelled = true;
      clearAllTimers();
    };
  }, [isPublic, isDismissed]);

  if (!isPublic || isDismissed) return null;

  const isShowing = phase === 'entering' || phase === 'visible';

  const gradientIndex = currentOrder.name.charCodeAt(1) % avatarGradients.length;
  const gradientClass = avatarGradients[gradientIndex];

  const wrapperStyle: React.CSSProperties = {
    opacity: isShowing ? 1 : 0,
    transform: isShowing ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
    pointerEvents: isShowing ? 'auto' : 'none',
    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'opacity, transform',
  };

  return (
    <>
      {/* ===== MOBILE ===== */}
      <div className={`fixed ${toastBottomMobile} left-3 z-[61] w-[280px] md:hidden`} style={wrapperStyle}>
        <div className="relative bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 py-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold text-white tracking-wide">Contoh Ilustrasi</span>
            <button onClick={handleDismiss} className="ml-auto text-white/50 hover:text-white transition-colors" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-[2px] bg-muted/30">
            <div className="h-full bg-emerald-500 transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} />
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/20`}>
                <span className="text-white text-sm font-bold">{getInitials(currentOrder.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate">{currentOrder.name} dari {currentOrder.city}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{currentOrder.amount}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="text-[9px] text-muted-foreground">{currentOrder.method}</span>
                  <span className="text-[9px] text-muted-foreground/40">•</span>
                  <span className="text-[9px] text-muted-foreground/50">{currentOrder.time}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP ===== */}
      <div className={`hidden md:block fixed ${toastBottomDesktop} left-6 z-[61] w-[320px]`} style={wrapperStyle}>
        <div className="relative bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">Contoh Ilustrasi</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-white/60 font-medium">Baru saja</span>
              <button onClick={handleDismiss} className="text-white/50 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-white/10" aria-label="Dismiss">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="h-[2px] bg-muted/30">
            <div className="h-full bg-emerald-500 transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} />
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/20`}>
                <span className="text-white text-base font-bold">{getInitials(currentOrder.name)}</span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs font-bold text-foreground truncate">
                  {currentOrder.name} dari <span className="text-muted-foreground">{currentOrder.city}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{currentOrder.amount}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-[11px] font-medium text-muted-foreground">{currentOrder.method}</span>
                  <span className="text-[11px] text-muted-foreground/40">•</span>
                  <span className="text-[11px] text-muted-foreground/60">{currentOrder.time}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60">Bergabung sekarang</span>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:gap-2 transition-all cursor-pointer">
                <span className="text-[10px] font-semibold">Order Sekarang</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
