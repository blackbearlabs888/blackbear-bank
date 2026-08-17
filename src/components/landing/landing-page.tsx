'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
// CookieConsent moved to root layout for global visibility
// import CookieConsent from '@/components/landing/cookie-consent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  CreditCard, Wallet, Truck, Shield, Clock, Users, ArrowRight,
  Zap, Star, TrendingUp, MessageCircle, Wifi,
  Smartphone, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Check
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { AnimatedCounter } from '@/components/landing/animated-counter';
import { FadeInSection } from '@/components/landing/fade-in-section';
import { OrganizationJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import AnnouncementBar from '@/components/landing/announcement-bar';
import { trackEvent } from '@/lib/analytics/track';

/* ====== Dynamic Imports for Below-Fold Components ====== */

const RateCalculator = dynamic(
  () => import('@/components/landing/rate-calculator'),
  {
    loading: () => (
      <div className="py-12 md:py-20">
        <div className="max-w-2xl mx-auto h-96 rounded-2xl bg-muted/50 animate-pulse" />
      </div>
    ),
    ssr: false,
  }
);

const TestimonialsSection = dynamic(
  () => import('@/components/landing/testimonials-section'),
  {
    loading: () => (
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="h-4 w-32 rounded bg-muted/50 animate-pulse mx-auto mb-3" />
            <div className="h-9 w-64 rounded bg-muted/50 animate-pulse mx-auto mb-4" />
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    ),
    ssr: false,
  }
);

const LiveActivityFeed = dynamic(
  () => import('@/components/landing/live-activity-feed'),
  {
    loading: () => (
      <div className="py-4">
        <div className="max-w-3xl mx-auto h-10 rounded-lg bg-muted/50 animate-pulse" />
      </div>
    ),
    ssr: false,
  }
);



// SocialProofToast moved to root layout for global visibility
// const SocialProofToast = dynamic(
//   () => import('@/components/landing/social-proof-toast'),
//   {
//     loading: () => null,
//     ssr: false,
//   }
// );

// RateComparisonTable removed — replaced by payment type running cards + rate calculator

const ExitIntentBanner = dynamic(
  () => import('@/components/landing/exit-intent-banner'),
  {
    loading: () => null,
    ssr: false,
  }
);


const CitiesSection = dynamic(
  () => import('@/components/landing/cities-section'),
  {
    loading: () => (
      <div className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="h-4 w-32 rounded bg-muted/50 animate-pulse mx-auto mb-3" />
            <div className="h-9 w-64 rounded bg-muted/50 animate-pulse mx-auto mb-4" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);


/* ====== Types ====== */

interface PaymentType {
  id: string;
  name: string;
  logoUrl?: string | null;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent: number;
  discountNominal: number;
  minTransaction: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: string;
  link?: string | null;
}

interface LandingPageProps {
  paymentTypes: PaymentType[];
  faqs: FAQ[];
  announcements: Announcement[];
}


/* ====== Helpers ====== */

function formatStatValue(index: number, raw: number): string {
  if (index === 0) return `${Math.floor(raw / 1000)}K+`;
  if (index === 1) return `${Math.floor(raw)}%`;
  if (index === 2) return `${Math.floor(raw)}/7`;
  if (index === 3) return `${Math.floor(raw)}\u2605`;
  return String(raw);
}


/* ====== Main Component ====== */

export default function LandingPage({ paymentTypes, faqs, announcements }: LandingPageProps) {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);
  const [ptLogoErrors, setPtLogoErrors] = useState<Set<string>>(new Set());
  const [cardSpotlight, setCardSpotlight] = useState<React.CSSProperties>({});
  const [cardTilt, setCardTilt] = useState<React.CSSProperties>({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const [allFaqOpen, setAllFaqOpen] = useState(false);
  const [activeFaqCategory, setActiveFaqCategory] = useState('semua');
  const [typedText, setTypedText] = useState('Gestun profesional untuk Kartu Kredit & Paylater. Proses instan, rate bersaing, aman & terpercaya.');
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const marqueeRow1Ref = useRef<HTMLDivElement>(null);
  const marqueeRow2Ref = useRef<HTMLDivElement>(null);
  const sectionHeadersRef = useRef<IntersectionObserver | null>(null);

  // IntersectionObserver for section header underline animation
  useEffect(() => {
    sectionHeadersRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -50px 0px' }
    );

    const headers = document.querySelectorAll('.section-header-underline');
    headers.forEach((header) => sectionHeadersRef.current?.observe(header));

    return () => {
      sectionHeadersRef.current?.disconnect();
    };
  }, []);

  // Hero subtitle text. Phase 4: the full text is part of the initial HTML
  // (server-rendered) so crawlers and users without JS still see the SEO
  // content. The typewriter effect runs only after client hydration and
  // progressively reveals the same string — no content is hidden from SEO.
  const heroSubtitle = 'Gestun profesional untuk Kartu Kredit & Paylater. Proses instan, rate bersaing, aman & terpercaya.';

  // Typewriter effect for hero subtitle (client-only progressive enhancement)
  useEffect(() => {
    let i = 0;
    // Reset to empty on client mount so the typewriter can reveal it.
    setTypedText('');
    const timer = setInterval(() => {
      if (i <= heroSubtitle.length) {
        setTypedText(heroSubtitle.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 18);
    return () => clearInterval(timer);
  }, []);

  // Marquee touch pause for mobile
  const handleTouchStart = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const inner = el.querySelector<HTMLElement>('[data-marquee-inner]');
    if (inner) inner.style.animationPlayState = 'paused';
  }, []);

  const handleTouchEnd = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const inner = el.querySelector<HTMLElement>('[data-marquee-inner]');
    if (inner) inner.style.animationPlayState = 'running';
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            setScrollProgress((scrollTop / docHeight) * 100);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getPaymentIcon = (index: number) => {
    const icons = [CreditCard, Wallet, Smartphone];
    return icons[index % icons.length];
  };

  const handlePtLogoError = useCallback((ptId: string) => {
    setPtLogoErrors(prev => new Set(prev).add(ptId));
  }, []);

  // Get unique FAQ categories
  const faqCategories = ['semua', ...Array.from(new Set(faqs.map(f => f.category || 'umum')))];
  const filteredFaqs = activeFaqCategory === 'semua' ? faqs : faqs.filter(f => (f.category || 'umum') === activeFaqCategory);

  return (
    <>
      <OrganizationJsonLd />
      <FAQJsonLd />

      {/* Scroll Progress Indicator */}
      <div
        className="fixed top-0 left-0 h-[2px] z-[100] shadow-[0_0_4px_var(--color-primary)] transition-opacity duration-300"
        style={{
          width: `${scrollProgress}%`,
          opacity: scrollProgress > 5 ? 1 : 0,
          background: 'linear-gradient(to right, var(--color-primary), #d946ef)',
        }}
      />

      <div className="relative animate-fade-in overflow-hidden">

        {/* ==================== ANNOUNCEMENT BAR ==================== */}
        <AnnouncementBar announcements={announcements} />

        {/* ==================== HERO SECTION ==================== */}
        <section className="relative overflow-hidden min-h-auto" id="hero">
          {/* Enhanced background gradient with mesh overlay */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* Base gradient — richer purple/fuchsia tones */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-fuchsia-500/[0.04] to-purple-500/[0.06]" />
            {/* Animated mesh blobs */}
            <div className="absolute top-10 -left-32 w-[500px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-pulse-soft" />
            <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-fuchsia-500/8 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '3s' }} />
            <div className="absolute -bottom-10 left-1/3 w-[300px] h-[300px] bg-purple-500/6 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '6s' }} />
            {/* Subtle diagonal accent line */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/[0.03] via-transparent to-transparent rotate-12" />
            {/* Noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 md:pt-28 md:pb-20 flex flex-col min-h-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center flex-1">
              {/* Left: Text Content */}
              <div className="text-center lg:text-left space-y-4">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-1">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5 text-primary text-sm font-medium shadow-sm shadow-primary/5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Layanan Gestun No #1</span>
                  </div>
                  {/* Trust badge with pulse */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-trust-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Terbaik</span>
                  </div>
                </div>

                {/* Heading */}
                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                    Tarik Tunai{' '}
                    <span className="hero-gradient-text">
                      Cepat & Aman
                    </span>
                  </h1>
                  <p ref={subtitleRef} className="text-sm sm:text-xl text-muted-foreground max-w-xs sm:max-w-lg mx-auto lg:mx-0 leading-relaxed min-h-[2.75rem] sm:min-h-[4rem]">
                    {typedText}
                    <span className="inline-block w-[2px] h-[1.1em] bg-primary/70 ml-0.5 align-middle animate-typewriter-blink" />
                  </p>
                </div>

                {/* CTA Buttons — Mobile: 2-grid, Desktop: inline */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:flex lg:gap-3 lg:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="cta-shimmer-hover gradient-primary text-white rounded-xl h-12 px-4 sm:px-8 text-sm font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.04] active:scale-[0.97] transition-all duration-300"
                  >
                    <Link href="/order">
                      <Zap className="w-4 h-4 relative z-[2]" />
                      <span className="sm:inline hidden relative z-[2]"></span><span className="relative z-[2]">Order Sekarang</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-xl h-12 px-4 sm:px-8 text-sm font-medium border-border/60 hover:bg-accent hover:border-primary/30 hover:shadow-lg hover:scale-[1.04] active:scale-[0.97] transition-all duration-300"
                  >
                    <Link href="/track">
                      <Truck className="w-4 h-4" />
                      <span className="sm:inline hidden"></span>Track Order
                    </Link>
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>100% Aman</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Proses 15-30 menit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Rating Pelanggan</span>
                  </div>
                </div>
              </div>

              {/* Right: Hero Card — Premium Holographic 2.0 */}
              <div className="flex justify-center lg:justify-end">
                <div
                  className="hero-card-wrapper relative w-full max-w-[260px] sm:max-w-[340px] lg:max-w-[380px]"
                  style={{ perspective: '1000px' }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    const rotateX = ((y - 50) / 50) * -8;
                    const rotateY = ((x - 50) / 50) * 8;
                    setCardSpotlight({
                      background: `radial-gradient(circle at ${x}% ${y}%, oklch(0.7 0.2 300 / 0.12) 0%, transparent 60%)`,
                    });
                    setCardTilt({
                      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
                      transition: 'transform 0.1s ease-out',
                    });
                  }}
                  onMouseLeave={() => {
                    setCardSpotlight({ background: 'transparent' });
                    setCardTilt({
                      transform: 'rotateX(0deg) rotateY(0deg) scale(1)',
                      transition: 'transform 0.5s ease-out',
                    });
                  }}
                >
                  {/* Glow behind card — smaller inset on mobile */}
                  <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-primary/20 via-fuchsia-500/15 to-purple-500/20 rounded-[2rem] blur-lg sm:blur-xl animate-pulse-soft" />

                  {/* Animated gradient border */}
                  <div className="hero-card-border" style={cardTilt}>
                    <div className="hero-card-inner p-4 sm:p-5 lg:p-6 shadow-2xl overflow-hidden">
                      {/* Holographic overlay */}
                      <div className="hero-card-holographic" />
                      <div className="hero-card-light-streak" />
                      <div className="hero-card-grid" />

                      {/* Floating particles — show only 2 on mobile */}
                      <div className="hero-card-particle" style={{ bottom: '20%', left: '15%', animationDelay: '0s', animationDuration: '3s' }} />
                      <div className="hero-card-particle" style={{ bottom: '35%', left: '55%', animationDelay: '1s', animationDuration: '4s' }} />
                      <div className="hero-card-particle hidden md:block" style={{ bottom: '15%', right: '25%', animationDelay: '2s', animationDuration: '3.5s' }} />
                      <div className="hero-card-particle hidden md:block" style={{ bottom: '50%', right: '40%', animationDelay: '0.5s', animationDuration: '4.5s' }} />

                      {/* Mouse-following spotlight */}
                      <div className="absolute inset-0 rounded-[1.375rem] transition-all duration-200 pointer-events-none" style={cardSpotlight} />

                      {/* Shine effect on hover */}
                      <div className="credit-card-shine rounded-[1.375rem]" style={{ zIndex: 10 }} />

                      <div className="relative z-10">
                        {/* Top row: brand + contactless */}
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="flex items-center gap-1.5">
                            {config.logoUrl && !logoError ? (
                              <div className="w-8 h-8 rounded-md overflow-hidden">
                                <img src={config.logoUrl} alt="" width={32} height={32} className="w-full h-full object-contain" onError={() => setLogoError(true)} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-md gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-xs">{getInitials()}</span>
                              </div>
                            )}
                            <div>
                              <p className="text-white text-[10px] sm:text-xs font-bold tracking-wide leading-tight">BLACKBEAR</p>
                              <p className="text-white/30 text-[8px] sm:text-[9px] tracking-widest uppercase">Gestun Pro</p>
                            </div>
                          </div>
                        </div>

                        {/* Chip */}
                        <div className="mb-3 sm:mb-4">
                          <div className="credit-chip w-10 h-7 sm:w-12 sm:h-8 relative">
                            <div className="credit-chip-lines" />
                          </div>
                        </div>

                        {/* Card number with glow */}
                        <div className="mb-3 sm:mb-4">
                          <p className="text-white/80 text-xs sm:text-sm lg:text-[15px] tracking-[0.15em] sm:tracking-[0.2em] font-mono font-light">
                            4520 •••• •••• 7891
                          </p>
                        </div>

                        {/* Bottom row */}
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-white/20 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mb-1">Card Holder</p>
                            <p className="text-white text-[11px] sm:text-sm font-semibold tracking-wide truncate max-w-[120px] sm:max-w-[160px] lg:max-w-none">{config.websiteTitle}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white/20 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mb-1">Member Since</p>
                            <p className="text-white/70 text-xs sm:text-sm font-mono">2023</p>
                          </div>
                        </div>

                        {/* Premium badge — top right floating */}
                        <div className="absolute top-3 right-3">
                          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-500/20 border border-amber-400/30 backdrop-blur-sm">
                            <p className="text-[9px] sm:text-[10px] font-bold text-amber-300 tracking-widest uppercase">★ VIP</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating badges — within bounds, no overflow */}
                  <div className="hidden sm:flex absolute -top-1 -right-1 w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-sm items-center justify-center animate-bounce-soft z-20">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="hidden sm:flex absolute -bottom-1 -left-1 w-12 h-12 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg backdrop-blur-sm items-center justify-center animate-bounce-soft z-20" style={{ animationDelay: '1s' }}>
                    <Wallet className="w-4 h-4 text-fuchsia-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== STATS SECTION ==================== */}
        <section className="relative py-6 sm:py-8 lg:py-12" aria-label="Ringkasan layanan">
          {/* Radial gradient background behind stats grid */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-fuchsia-500/[0.04]" />
          {/* Radial glow accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/[0.04] rounded-full blur-[80px] pointer-events-none" />
          {/* Bottom fade edge */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent z-[1]" />
          <FadeInSection className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-[2] py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
              {[
                { label: 'Transaksi', icon: CreditCard, target: 10000 },
                { label: 'Sukses Rate', icon: TrendingUp, target: 99 },
                { label: 'Support', icon: Clock, target: 24 },
                { label: 'Rating', icon: Star, target: 5 },
              ].map((stat, i) => (
                <Card key={i} className={`group relative overflow-hidden bg-background/60 backdrop-blur-sm border-border/20 py-0 gap-0 rounded-xl stat-card-hover ${i < 3 ? 'stat-card-divider' : ''}`}>
                  <div className="absolute top-0 left-4 right-4 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-primary/40 to-fuchsia-500/40 transition-all duration-500 rounded-full" />
                  <CardContent className="flex items-center gap-3 p-4 md:p-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 stat-icon-animated">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold tracking-tight">
                        <AnimatedCounter target={stat.target} startOnView formatter={(v) => formatStatValue(i, v)} />
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Phase 4: explicit illustrative label so the counters above are
                never mistaken for verified live metrics. Re-enable real
                counters only when backed by anonymized, verified data. */}
            <p className="text-center text-[11px] text-muted-foreground/70 mt-3">
              *Angka ilustrasi untuk menampilkan format metrik layanan.
            </p>
          </FadeInSection>
        </section>

        {/* Section Divider */}
        <div className="section-divider" />

        {/* ==================== LIVE ACTIVITY FEED ==================== */}
        <LiveActivityFeed />



        {/* ==================== RATE CALCULATOR ==================== */}
        <RateCalculator paymentTypes={paymentTypes} />

        {/* ==================== PAYMENT TYPES — Running Text Cards ==================== */}
        {paymentTypes.length > 0 && (
          <section className="relative py-16 md:py-24 below-fold-auto" id="payment-types">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <div className="text-center mb-8">
                <p className="text-sm font-medium text-primary mb-3">Jenis Pembayaran</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
                  Metode Pembayaran Tersedia
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Berbagai pilihan pembayaran dengan rate kompetitif.
                </p>
              </div>

              {/* Running text — Row 1 */}
              <div
                ref={marqueeRow1Ref}
                className="relative overflow-hidden"
                onTouchStart={() => handleTouchStart(marqueeRow1Ref.current)}
                onTouchEnd={() => handleTouchEnd(marqueeRow1Ref.current)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                <div className="flex group/runner hover:[animation-play-state:paused]">
                  <div
                    data-marquee-inner
                    className="flex gap-3 w-max"
                    style={{ animation: `scroll-left ${Math.max(20, paymentTypes.length * 6)}s linear infinite` }}
                  >
                    {[...paymentTypes, ...paymentTypes].map((pt, index) => {
                      const Icon = getPaymentIcon(index % paymentTypes.length);
                      const isFirstOriginal = index < paymentTypes.length && index === 0;
                      const hasLogo = pt.logoUrl && !ptLogoErrors.has(pt.id);
                      const hasDiscount = pt.discountPercent > 0 || pt.discountNominal > 0;
                      return (
                        <Link
                          key={`${pt.id}-${index}`}
                          href="/order"
                          className={`payment-card-glow flex items-center gap-2.5 px-5 py-3 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm hover:border-primary/30 hover:bg-background transition-all duration-300 flex-shrink-0 group/card relative ${isFirstOriginal ? 'ml-14 md:ml-20' : ''}`}
                        >
                          {isFirstOriginal && (
                            <span className="px-2 py-0.5 rounded-full gradient-primary text-white text-[10px] font-bold shadow-sm whitespace-nowrap flex-shrink-0">
                              Rate terbaik!
                            </span>
                          )}
                          {hasLogo ? (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-background/50 border border-border/30">
                              <img src={pt.logoUrl} alt={pt.name} width={32} height={32} loading="lazy" className="w-full h-full object-contain" onError={() => handlePtLogoError(pt.id)} />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <span className="text-sm font-medium whitespace-nowrap group-hover/card:text-primary transition-colors overflow-hidden text-ellipsis max-w-[140px] sm:max-w-none">
                            {pt.name}
                          </span>
                          {hasDiscount && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                              ★ Diskon{pt.discountPercent > 0 ? ` ${pt.discountPercent}%` : ''}
                            </span>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/card:text-primary group-hover/card:translate-x-0.5 transition-all" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Running text — Row 2 (reverse) */}
              {paymentTypes.length > 2 && (
                <div
                  ref={marqueeRow2Ref}
                  className="relative overflow-hidden mt-3"
                  onTouchStart={() => handleTouchStart(marqueeRow2Ref.current)}
                  onTouchEnd={() => handleTouchEnd(marqueeRow2Ref.current)}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                  <div className="flex group/runner2 hover:[animation-play-state:paused]">
                    <div
                      data-marquee-inner
                      className="flex gap-3 w-max"
                      style={{ animation: `scroll-right ${Math.max(22, paymentTypes.length * 7)}s linear infinite` }}
                    >
                      {[...paymentTypes, ...paymentTypes].map((pt, index) => {
                        const Icon = getPaymentIcon(index % paymentTypes.length);
                        const hasLogo = pt.logoUrl && !ptLogoErrors.has(pt.id);
                        const hasDiscount = pt.discountPercent > 0 || pt.discountNominal > 0;
                        return (
                          <Link
                            key={`rev-${pt.id}-${index}`}
                            href="/order"
                            className="payment-card-glow flex items-center gap-2.5 px-5 py-3 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm hover:border-primary/30 hover:bg-background transition-all duration-300 flex-shrink-0 group/card"
                          >
                            {hasLogo ? (
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-background/50 border border-border/30">
                                <img src={pt.logoUrl} alt={pt.name} width={32} height={32} loading="lazy" className="w-full h-full object-contain" onError={() => handlePtLogoError(pt.id)} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-fuchsia-500" />
                              </div>
                            )}
                            <span className="text-sm font-medium whitespace-nowrap group-hover/card:text-fuchsia-500 transition-colors">
                              {pt.name}
                            </span>
                            {hasDiscount && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                                ★ Diskon{pt.discountPercent > 0 ? ` ${pt.discountPercent}%` : ''}
                              </span>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/card:text-fuchsia-500 group-hover/card:translate-x-0.5 transition-all" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section Divider */}
        <div className="section-divider" />

        {/* ==================== SERVICES — Desktop: Feature Cards Row ==================== */}
        <section className="relative py-16 md:py-24 below-fold-auto">
          <FadeInSection className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-primary mb-3">Layanan Kami</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
                Layanan Lengkap untuk Anda
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed mb-2">
                Kami menyediakan berbagai layanan gestun dengan proses cepat dan aman.
              </p>
            </div>

            {/* Desktop: 3 equal feature cards in a row */}
            <div className="hidden md:block relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-primary/[0.03] via-transparent to-fuchsia-500/[0.02] rounded-3xl -z-10" />
              <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: CreditCard,
                  title: 'Kartu Kredit',
                  description: 'Gestun semua jenis kartu kredit — Visa, Mastercard, JCB. Rate terbaik, proses cepat, dan dana langsung cair ke rekening Anda.',
                  accent: 'from-primary to-purple-500',
                  iconBg: 'bg-gradient-to-br from-primary/10 to-purple-500/10',
                  iconColor: 'text-primary',
                  tags: ['Visa', 'Mastercard', 'JCB', 'BCA', 'BNI', 'Mandiri'],
                  tagStyle: 'bg-muted/80 text-muted-foreground',
                },
                {
                  icon: Wallet,
                  title: 'Paylater',
                  description: 'Tarik dana dari GoPay Paylater, Shopee Paylater, Akulaku, dan berbagai paylater lainnya dengan mudah.',
                  accent: 'from-fuchsia-500 to-pink-500',
                  iconBg: 'bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10',
                  iconColor: 'text-fuchsia-500',
                  tags: ['GoPay', 'Shopee', 'Akulaku'],
                  tagStyle: 'bg-fuchsia-500/5 text-fuchsia-500/80 border border-fuchsia-500/10',
                },
                {
                  icon: Shield,
                  title: 'Aman & Terpercaya',
                  description: 'Transaksi dilindungi sistem tracking real-time. Proses transparan dan terpercaya.',
                  accent: 'from-emerald-500 to-teal-500',
                  iconBg: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10',
                  iconColor: 'text-emerald-500',
                  tags: ['Tracking Real-time', 'Proses Andal', '<30 Menit'],
                  tagStyle: 'bg-emerald-500/5 text-emerald-500/80 border border-emerald-500/10',
                },
              ].map((f, i) => (
                <Card
                  key={i}
                  className="group relative border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-500 py-0 gap-0 bg-background overflow-hidden animate-[fadeInUp_0.6s_ease-out_both]"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {/* Top accent bar on hover */}
                  <div className={`h-0.5 w-0 group-hover:w-full bg-gradient-to-r ${f.accent} transition-all duration-500`} />
                  <CardContent className="p-6 lg:p-7">
                    <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {f.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.tags.map((tag) => (
                        <span key={tag} className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${f.tagStyle}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>

            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-4">
              {[
                {
                  icon: CreditCard,
                  title: 'Kartu Kredit',
                  description: 'Gestun semua jenis kartu kredit — Visa, Mastercard, JCB. Rate terbaik dan proses cepat.',
                  iconBg: 'bg-gradient-to-br from-primary/10 to-purple-500/10', iconColor: 'text-primary',
                  tags: ['Visa', 'Mastercard', 'JCB'],
                  tagStyle: 'bg-muted/80 text-muted-foreground',
                },
                {
                  icon: Wallet,
                  title: 'Paylater',
                  description: 'Tarik dana dari GoPay, Shopee, Akulaku, dan paylater lainnya.',
                  iconBg: 'bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10', iconColor: 'text-fuchsia-500',
                  tags: ['GoPay', 'Shopee', 'Akulaku'],
                  tagStyle: 'bg-fuchsia-500/5 text-fuchsia-500/80 border border-fuchsia-500/10',
                },
                {
                  icon: Shield,
                  title: 'Aman & Terpercaya',
                  description: 'Tracking real-time, proses transparan.',
                  iconBg: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10', iconColor: 'text-emerald-500',
                  tags: ['Tracking Real-time', 'Proses Andal'],
                  tagStyle: 'bg-emerald-500/5 text-emerald-500/80 border border-emerald-500/10',
                },
              ].map((f, i) => (
                <Card key={i} className="border-border/50 py-0 gap-0 bg-background active:scale-[0.98] transition-transform duration-150 overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary to-fuchsia-500" />
                  <CardContent className="p-5 pl-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                      </div>
                      <h3 className="font-semibold">{f.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.tags.map((tag) => (
                        <span key={tag} className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${f.tagStyle}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </FadeInSection>
        </section>

        {/* Section Divider */}
        <div className="section-divider" />

        {/* ==================== HOW IT WORKS — Number Pipeline ==================== */}
        <section className="relative py-12 md:py-20 below-fold-auto">
          <FadeInSection className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm font-medium text-primary mb-3">Cara Kerja</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
                Semudah 3 Langkah
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Proses gestun yang simpel dan transparan. Dana cair dalam hitungan menit.
              </p>
            </div>

            {/* Pipeline */}
            <div className="max-w-3xl mx-auto">
              {/* Desktop: horizontal pipeline */}
              <div className="hidden md:flex items-start justify-between gap-0 relative">
                {/* Connecting line with flowing dots */}
                <div className="absolute top-10 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-primary/20 via-fuchsia-500/20 to-primary/20">
                  <div className="step-connector absolute inset-0" />
                </div>

                {[
                  { step: 1, icon: CreditCard, title: 'Buat Order', brief: 'Isi formulir pemesanan', description: 'Pilih jenis pembayaran, masukkan nominal, dan submit order melalui website.' },
                  { step: 2, icon: MessageCircle, title: 'Verifikasi', brief: 'Tim kami verifikasi data', description: 'Tim kami akan memverifikasi data dan menghubungi Anda via WhatsApp.' },
                  { step: 3, icon: Wallet, title: 'Dana Diterima', brief: 'Dana langsung cair!', description: 'Setelah verifikasi, dana langsung ditransfer ke rekening Anda.' },
                ].map((item) => (
                  <div key={item.step} className={`flex-1 flex flex-col items-center text-center relative z-10 ${item.step === 3 ? 'step-done-container cursor-pointer' : ''}`}>
                    {/* Step circle with pulsing glow */}
                    <div className="w-20 h-20 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center relative step-circle-glow" style={{ animationDelay: `${(item.step - 1) * 0.8}s` }}>
                      <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 relative">
                        {item.step === 3 ? (
                          <>
                            <item.icon className="w-6 h-6 text-white step-done-icon" />
                            <Check className="w-6 h-6 text-white absolute step-done-check" />
                          </>
                        ) : (
                          <item.icon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      {/* Number badge */}
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-primary/20">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold mt-5 mb-0.5">{item.title}</h3>
                    <p className="text-xs text-primary/70 font-medium mb-1.5">{item.brief}</p>
                    <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mobile: vertical pipeline */}
              <div className="md:hidden relative">
                {/* Vertical line with flowing dots */}
                <div className="absolute left-5 top-8 bottom-8 w-px bg-gradient-to-b from-primary/20 via-fuchsia-500/20 to-primary/20">
                  <div className="step-connector-vertical absolute inset-0" />
                </div>

                {[
                  { step: 1, icon: CreditCard, title: 'Buat Order', brief: 'Isi formulir pemesanan', description: 'Pilih jenis pembayaran, masukkan nominal, dan submit order melalui website.' },
                  { step: 2, icon: MessageCircle, title: 'Verifikasi', brief: 'Tim kami verifikasi data', description: 'Tim kami akan memverifikasi data dan menghubungi Anda via WhatsApp.' },
                  { step: 3, icon: Wallet, title: 'Dana Diterima', brief: 'Dana langsung cair!', description: 'Setelah verifikasi, dana langsung ditransfer ke rekening Anda.' },
                ].map((item) => (
                  <div key={item.step} className={`flex gap-5 py-6 relative ${item.step === 3 ? 'step-done-container cursor-pointer' : ''}`}>
                    {/* Circle on the line */}
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center step-circle-glow" style={{ animationDelay: `${(item.step - 1) * 0.8}s` }}>
                        <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center relative">
                          {item.step === 3 ? (
                            <>
                              <item.icon className="w-3 h-3 text-white step-done-icon" />
                              <Check className="w-3 h-3 text-white absolute step-done-check" />
                            </>
                          ) : (
                            <item.icon className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 pl-5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white bg-gradient-to-br from-primary to-fuchsia-500 px-2 py-0.5 rounded-full shadow-md shadow-primary/20">Step {item.step}</span>
                        <span className="text-xs text-primary/70 font-medium">{item.brief}</span>
                      </div>
                      <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* Section Divider */}
        <div className="section-divider" />

        {/* ==================== TRUST INDICATORS ==================== */}
        <div className="relative py-6 bg-gradient-to-r from-primary/[0.02] via-fuchsia-500/[0.015] to-primary/[0.02] border-y border-primary/[0.05]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {[
                { icon: Shield, label: 'SSL Secured', sub: 'Enkripsi 256-bit' },
                { icon: Clock, label: 'Proses Instan', sub: '15-30 menit' },
                { icon: Users, label: 'Pelanggan Terpercaya', sub: 'Layanan aktif' },
                { icon: Star, label: 'Rating Pelanggan', sub: 'Berdasarkan ulasan' },
                { icon: Zap, label: '24/7 Support', sub: 'Siap membantu' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== WHY CHOOSE US — Features Grid ==================== */}
        <section className="relative py-12 md:py-20 below-fold-auto">
          <FadeInSection className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-10">
              <p className="text-sm font-medium text-primary mb-3">Keunggulan</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
                Kenapa Memilih{' '}
                <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">Kami?</span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Kami berkomitmen memberikan layanan terbaik untuk setiap transaksi Anda.
              </p>
            </div>

            {/* Features Grid */}
            <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4 md:gap-5">
              {[
                {
                  num: '01',
                  title: 'Rate Terbaik',
                  description: 'Dapatkan rate gestun paling kompetitif di pasar. Kami menjamin harga terbaik untuk setiap transaksi Anda.',
                  gradient: 'from-primary to-purple-500',
                },
                {
                  num: '02',
                  title: 'Proses Instan',
                  description: 'Dana cair ke rekening Anda dalam waktu 15-30 menit. Tidak perlu menunggu lama.',
                  gradient: 'from-fuchsia-500 to-pink-500',
                },
                {
                  num: '03',
                  title: 'Aman 100%',
                  description: 'Semua transaksi dilindungi sistem keamanan berlapis. Data Anda tersimpan aman dan terenkripsi.',
                  gradient: 'from-emerald-500 to-teal-500',
                },
                {
                  num: '04',
                  title: 'Support 24/7',
                  description: 'Tim customer service kami siap membantu Anda kapanpun. Hubungi via WhatsApp untuk respons cepat.',
                  gradient: 'from-amber-500 to-orange-500',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="relative p-[1px] rounded-2xl bg-gradient-to-br from-transparent via-transparent to-transparent group/border transition-all duration-500 hover:from-primary/30 hover:via-fuchsia-500/20 hover:to-primary/30 group-hover/border:scale-[1.02] animate-[fadeInUp_0.6s_ease-out_both]"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="relative border border-border/50 rounded-[calc(1rem-1px)] p-5 md:p-6 hover:shadow-lg transition-all duration-300 bg-background">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-white text-sm font-bold">{feature.num}</span>
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-base">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeInSection>
        </section>

        {/* ==================== TESTIMONIALS SECTION ==================== */}
        <TestimonialsSection />

        {/* ==================== FAQ SECTION ==================== */}
        {faqs.length > 0 && (
          <section className="relative py-12 md:py-20 bg-muted/30 below-fold-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <div className="text-center mb-8">
                <p className="text-sm font-medium text-primary mb-3">FAQ</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
                  Pertanyaan yang Sering Diajukan
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed mb-6">
                  Temukan jawaban untuk pertanyaan umum tentang layanan kami.
                </p>

                {/* Category Filter Tabs */}
                <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
                  {faqCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveFaqCategory(cat); setAllFaqOpen(false); }}
                      className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                        activeFaqCategory === cat
                          ? 'gradient-primary text-white shadow-md shadow-primary/20'
                          : 'bg-background border border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary'
                      }`}
                    >
                      {cat === 'semua' ? 'Semua' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop: 2-column grid */}
              <div className="hidden md:grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                {filteredFaqs.map((faq, index) => (
                  <Card key={faq.id} className="faq-card-hover border-border/50 bg-background py-0 gap-0 overflow-hidden">
                    <Accordion
                      key={`${String(allFaqOpen)}-${activeFaqCategory}`}
                      type={allFaqOpen ? 'multiple' : 'single'}
                      collapsible
                      defaultValue={allFaqOpen ? [faq.id] : undefined}
                      className="w-full"
                    >
                      <AccordionItem value={faq.id} className="border-none">
                        <AccordionTrigger className="faq-trigger text-left text-sm font-medium hover:text-primary hover:no-underline transition-colors duration-200 py-4 px-5 gap-3">
                          <div className="flex items-start gap-3 text-left">
                            <span className="mt-0.5 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-primary">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="leading-snug">{faq.question}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm leading-relaxed px-5 pb-4 pl-[3.25rem]">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                ))}
              </div>

              {/* Mobile: single column */}
              <div className="md:hidden max-w-2xl mx-auto space-y-3">
                {filteredFaqs.map((faq, index) => (
                  <Card key={faq.id} className="faq-card-hover border-border/50 bg-background py-0 gap-0 overflow-hidden">
                    <Accordion
                      key={`${String(allFaqOpen)}-${activeFaqCategory}`}
                      type={allFaqOpen ? 'multiple' : 'single'}
                      collapsible
                      defaultValue={allFaqOpen ? [faq.id] : undefined}
                      className="w-full"
                    >
                      <AccordionItem value={faq.id} className="border-none">
                        <AccordionTrigger className="faq-trigger text-left text-sm font-medium hover:text-primary hover:no-underline transition-colors duration-200 py-4 px-5 gap-3">
                          <div className="flex items-start gap-3 text-left">
                            <span className="mt-0.5 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-primary">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="leading-snug">{faq.question}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm leading-relaxed px-5 pb-4 pl-[3.25rem]">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                ))}
              </div>

              {/* Bottom help text — Still have questions CTA */}
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Masih ada pertanyaan?{' '}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-xl px-6 h-10 text-sm font-medium border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <a
                    href={config.footerWhatsapp ? `https://wa.me/${config.footerWhatsapp}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('click_wa', { page_path: '/', page_type: 'landing_hero' })}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Tanyakan via WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Section Divider */}
        <div className="section-divider" />

        {/* ==================== PARTNER SECTION — Modern Gradient Card ==================== */}
        <section className="relative py-12 md:py-20 below-fold-auto">
          <FadeInSection className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-fuchsia-500/10" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-500/5 rounded-full blur-3xl" />

              <div className="relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-16 p-8 md:p-12 lg:p-16">
                {/* Left: Content */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/70 text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Program Mitra
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                    Bergabung Menjadi{' '}
                    <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
                      Mitra Kami
                    </span>
                  </h2>
                  <p className="text-white/50 text-base leading-relaxed">
                    Dapatkan penghasilan tambahan dengan menjadi mitra. Komisi menarik dan dukungan penuh dari tim kami.
                  </p>

                  {/* Benefits Grid */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    {[
                      { icon: TrendingUp, text: 'Komisi hingga 30%', color: 'text-emerald-400' },
                      { icon: Clock, text: 'Dashboard real-time', color: 'text-primary' },
                      { icon: MessageCircle, text: 'Support 24/7', color: 'text-fuchsia-400' },
                      { icon: Shield, text: 'Sistem transparan', color: 'text-amber-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                        <span className="text-sm text-white/70 font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-white/90 rounded-xl h-12 px-8 shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-2"
                  >
                    <Link href="/register">
                      <Users className="w-4 h-4" />
                      Daftar Menjadi Mitra
                    </Link>
                  </Button>
                </div>

                {/* Right: Stats Card */}
                <div className="hidden lg:flex items-center justify-center">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-fuchsia-500/20 rounded-3xl blur-xl" />
                    <div className="relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-8 space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-bold">Mitra Premium</p>
                          <p className="text-white/40 text-xs">Keuntungan eksklusif</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {[
                          { label: 'Komisi per Transaksi', value: '30%', bar: 'w-[60%]', color: 'bg-gradient-to-r from-primary to-fuchsia-500' },
                          { label: 'Payout Speed', value: 'H+1', bar: 'w-[40%]', color: 'bg-gradient-to-r from-emerald-400 to-emerald-500' },
                          { label: 'Support Response', value: '<5m', bar: 'w-[90%]', color: 'bg-gradient-to-r from-amber-400 to-orange-500' },
                        ].map((stat, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/50">{stat.label}</span>
                              <span className="text-white font-bold">{stat.value}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5">
                              <div className={`h-full rounded-full ${stat.color} ${stat.bar}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* ==================== BANDINGKAN KAMI — Comparison Section ==================== */}
        <section className="relative py-12 md:py-20 below-fold-auto">
          <FadeInSection className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <p className="text-sm font-medium text-primary mb-3">Bandingkan Kami</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
                Kenapa BlackBear Lebih Baik?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Lihat perbandingan layanan kami dengan layanan gestun lainnya.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="border-border/50 bg-background py-0 gap-0 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 px-4 sm:px-6 py-3 border-b border-border/30">
                  <div className="text-left">Fitur</div>
                  <div className="text-center">Lainnya</div>
                  <div className="text-center">
                    <span className="text-primary">BlackBear</span>
                  </div>
                </div>

                {/* Comparison Rows */}
                {[
                  {
                    feature: 'Proses',
                    icon: Clock,
                    others: '1–3 hari',
                    ours: '15–30 menit',
                  },
                  {
                    feature: 'Rate Fee',
                    icon: TrendingUp,
                    others: '5–8%',
                    ours: 'Mulai 1%',
                  },
                  {
                    feature: 'Support',
                    icon: MessageCircle,
                    others: 'Kantor jam kerja',
                    ours: '24/7 Online',
                  },
                ].map((row, i) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-3 items-center px-4 sm:px-6 py-4 sm:py-5 transition-colors duration-200 hover:bg-muted/20 ${
                      i < 2 ? 'border-b border-border/20' : ''
                    }`}
                  >
                    {/* Feature */}
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <row.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{row.feature}</span>
                    </div>

                    {/* Others */}
                    <div className="text-center text-sm text-muted-foreground/70 line-through decoration-muted-foreground/30">
                      {row.others}
                    </div>

                    {/* BlackBear */}
                    <div className="text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-primary/10 text-primary compare-highlight-cell border border-primary/15">
                        {row.ours}
                      </span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </FadeInSection>
        </section>

        {/* Section Divider */}
        <div className="section-divider" />

        {/* ==================== CTA SECTION — Clean & Different from Partner ==================== */}
        <section className="relative py-16 md:py-24 overflow-hidden below-fold-auto">
          {/* Dot grid pattern background */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, var(--color-primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          {/* Floating orbs */}
          <div className="absolute top-1/4 -left-16 w-48 h-48 bg-primary/10 rounded-full blur-[80px] animate-pulse-soft" />
          <div className="absolute bottom-1/4 -right-16 w-48 h-48 bg-fuchsia-500/8 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '3s' }} />

          <FadeInSection className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* Top accent line */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-8" />

              <div className="cta-section-border">
                <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 bg-background rounded-[calc(1.5rem-2px)] p-6 md:p-8">
                {/* Left — Text */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Siap Tarik Tunai{' '}
                    <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                      Kartu Kredit Anda?
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    Proses cepat, rate terbaik, dan dana langsung cair. Ribuan pelanggan telah membuktikan.
                  </p>
                </div>

                {/* Right — Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Button
                    asChild
                    size="lg"
                    className="cta-shimmer-hover gradient-primary text-white rounded-xl h-12 px-8 text-sm font-medium shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Link href="/order">
                      <Zap className="w-4 h-4 relative z-[2]" />
                      <span className="relative z-[2]">Order Sekarang</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-xl h-12 px-8 text-sm font-medium border-border/60 hover:bg-accent transition-all duration-300"
                  >
                    <Link href="/track">
                      <Truck className="w-4 h-4" />
                      Track Order
                    </Link>
                  </Button>
                </div>
              </div>
              </div>

              {/* Bottom accent line */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent mt-8" />
            </div>
          </FadeInSection>
        </section>

        {/* ==================== CITIES WE SERVE ==================== */}
        <div className="section-divider" />
        <CitiesSection />

        <ExitIntentBanner />
      </div>
    </>
  );
}
