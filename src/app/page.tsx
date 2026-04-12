'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Wallet,
  Truck,
  Shield,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Zap,
  Star,
  MessageCircle,
  Wifi,
  CheckCircle2,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { OrganizationJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import TestimonialsSection from '@/components/testimonials-section';
import PaymentTypesTable from '@/components/payment-types-table';

const features = [
  {
    icon: CreditCard,
    title: 'Kartu Kredit',
    description: 'Tarik tunai dari semua jenis kartu kredit dengan proses cepat dan aman.',
  },
  {
    icon: Wallet,
    title: 'Paylater',
    description: 'GoPay, Shopee, Akulaku & berbagai platform paylater tersedia.',
  },
  {
    icon: Truck,
    title: 'COD & Online',
    description: 'Pilih metode transaksi COD atau online sesuai kebutuhan Anda.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Buat Order',
    description: 'Isi nominal dan data rekening tujuan Anda melalui form order.',
  },
  {
    step: '02',
    title: 'Verifikasi',
    description: 'Tim kami memverifikasi dan memproses order dengan cepat.',
  },
  {
    step: '03',
    title: 'Dana Diterima',
    description: 'Dana langsung ditransfer ke rekening Anda.',
  },
];

const partnerBenefits = [
  'Komisi hingga 30% dari setiap transaksi',
  'Tier & Badge dengan reward menarik',
  'Target bulanan dengan bonus',
  'Support tim profesional 24/7',
];

// Animated Number
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{count.toLocaleString('id-ID')}{suffix}</span>;
}

// Credit Card Visual — compact text on mobile
function CreditCardVisual({ siteName, getInitials, logoUrl, logoError, setLogoError }: {
  siteName: string;
  getInitials: () => string;
  logoUrl: string | null;
  logoError: boolean;
  setLogoError: (error: boolean) => void;
}) {
  return (
    <div className="relative w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[420px] mx-auto">
      <div className="absolute -inset-6 bg-primary/10 rounded-[2rem] blur-3xl" />

      <div className="relative aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #1a1a2e 60%, #2d1b4e 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(45deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(217, 70, 239, 0.15) 100%)',
        }} />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            style={{ animation: 'shine 3s ease-in-out infinite' }} />
        </div>
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="none">
            <defs>
              <pattern id="cardPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cardPattern)" />
          </svg>
        </div>

        {/* Card content — compact on mobile */}
        <div className="relative z-10 h-full p-3 sm:p-5 md:p-6 flex flex-col justify-between">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div className="w-8 h-6 sm:w-11 sm:h-8 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center">
              <div className="w-5 h-3.5 sm:w-7 sm:h-5 border border-amber-700/30 rounded-sm" />
            </div>
            <div className="text-white/40">
              <Wifi className="w-4 h-4 sm:w-5 sm:h-5 rotate-90" />
            </div>
          </div>

          {/* Card number — truncate on small screens */}
          <div className="my-2 sm:my-3 md:my-4">
            <p className="text-white text-xs sm:text-lg md:text-xl tracking-[0.2em] sm:tracking-[0.25em] font-mono drop-shadow-lg overflow-hidden">
              <span className="hidden sm:inline">•••• •••• •••• ••••</span>
              <span className="sm:hidden">•••• •••• ••••</span>
            </p>
          </div>

          {/* Bottom row — compact on mobile */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white/40 text-[8px] sm:text-[10px] uppercase tracking-wider mb-px">Card Holder</p>
              <p className="text-white text-[11px] sm:text-sm md:text-base font-medium tracking-wide truncate">VALUED CUSTOMER</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 sm:gap-2 justify-end">
                {logoUrl && !logoError ? (
                  <img src={logoUrl} alt={siteName} className="w-5 h-5 sm:w-7 sm:h-7 object-contain" onError={() => setLogoError(true)} />
                ) : (
                  <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white text-[8px] sm:text-[10px] font-bold">{getInitials()}</span>
                  </div>
                )}
                <span className="text-white font-bold text-[11px] sm:text-base md:text-lg tracking-tight">{siteName}</span>
              </div>
              <p className="text-white/40 text-[8px] sm:text-[10px] mt-px">Premium Card</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);
  const siteName = config.websiteTitle || 'Black Bear';

  return (
    <>
      <OrganizationJsonLd />
      <FAQJsonLd />

      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* ─── HERO ─── */}
        <header className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.08), transparent)',
          }} />

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
              <div className="flex-1 max-w-xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  Layanan Gestun Terpercaya
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 leading-[1.1] tracking-tight">
                  Butuh Dana Cepat?
                  <br />
                  <span className="text-primary">{siteName}</span>{' '}
                  <span className="text-primary">Solusinya</span>
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto lg:mx-0 leading-relaxed">
                  {config.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat, aman, dan transparan.'}
                </p>

                <div className="grid grid-cols-2 gap-3 max-w-[280px] mx-auto lg:mx-0 mb-5">
                  <Button asChild className="h-12 text-sm font-medium">
                    <Link href="/order">
                      <ArrowRight className="w-4 h-4 mr-1.5" />
                      Order
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 text-sm font-medium">
                    <Link href="/track">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Track
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center justify-center lg:justify-start gap-2.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> Aman</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Cepat</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                  <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-primary" /> Terpercaya</span>
                </div>
              </div>

              <div className="flex-1 flex justify-center items-center" role="img" aria-label="Credit card illustration">
                <CreditCardVisual siteName={siteName} getInitials={getInitials} logoUrl={config.logoUrl} logoError={logoError} setLogoError={setLogoError} />
              </div>
            </div>
          </div>
        </header>

        {/* ─── STATS ─── */}
        <section className="relative z-10 border-y overflow-hidden" aria-label="Statistics">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-purple-500/[0.04] to-primary/[0.03]" />
          <div className="container mx-auto px-4 relative">
            <div className="grid grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto divide-x divide-border">
              {[
                { value: <AnimatedNumber value={10000} suffix="+" />, label: 'Transaksi', icon: Zap },
                { value: <AnimatedNumber value={99} suffix="%" />, label: 'Sukses Rate', icon: Star },
                { value: '24/7', label: 'Support', icon: Shield },
                { value: '5★', label: 'Rating', icon: Sparkles },
              ].map((stat) => {
                const StatIcon = stat.icon;
                return (
                  <div key={stat.label} className="py-10 text-center group">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                      <StatIcon className="w-4.5 h-4.5 text-primary/60" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mb-0.5 tabular-nums">{stat.value}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── LAYANAN ─── */}
        <section className="relative py-24 md:py-28 z-10" aria-labelledby="services-heading">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[100px] pointer-events-none" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Sparkles className="w-3 h-3" />
                Fitur Unggulan
              </div>
              <h2 id="services-heading" className="text-2xl md:text-3xl font-bold mb-2">Layanan Kami</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Pilih layanan tarik tunai yang sesuai dengan kebutuhan Anda
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group relative p-7 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/[0.05] transition-all duration-500 hover:-translate-y-1"
                  >
                    {/* Top accent line */}
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent group-hover:via-primary/60 transition-colors duration-500" />

                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25 transition-all duration-500">
                      <Icon className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-500" />
                    </div>
                    <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>

                    {/* Bottom-right number */}
                    <span className="absolute bottom-4 right-5 text-5xl font-black text-muted-foreground/[0.04] select-none group-hover:text-primary/[0.06] transition-colors duration-500">
                      0{i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── PAYMENT TYPES ─── */}
        <PaymentTypesTable />

        {/* ─── CARA KERJA ─── */}
        <section className="relative py-24 md:py-28 z-10" aria-labelledby="how-heading">
          <div className="absolute inset-0 bg-muted/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Zap className="w-3 h-3" />
                Mudah & Cepat
              </div>
              <h2 id="how-heading" className="text-2xl md:text-3xl font-bold mb-2">Cara Kerja</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Hanya 3 langkah sederhana untuk mendapatkan dana Anda
              </p>
            </div>

            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-0">
              {steps.map((step, i) => (
                <div key={step.step} className="relative flex md:flex-col items-start md:items-center gap-5 md:gap-0 md:text-center md:px-6">
                  {/* Desktop connecting line */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] right-0 h-px">
                      <div className="w-full h-full bg-gradient-to-r from-primary/30 to-primary/10" />
                      <ArrowRight className="absolute -top-[7px] right-0 w-3.5 h-3.5 text-primary/30" />
                    </div>
                  )}

                  {/* Mobile connecting line */}
                  {i < steps.length - 1 && (
                    <div className="md:hidden absolute left-[23px] top-12 bottom-0 w-px">
                      <div className="w-full h-full bg-gradient-to-b from-primary/30 to-transparent" />
                    </div>
                  )}

                  {/* Step number */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-base font-bold shadow-lg shadow-primary/25 relative z-10 ring-4 ring-primary/10">
                    {step.step}
                  </div>

                  {/* Content */}
                  <div className="md:mt-5">
                    <h3 className="font-semibold text-base mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <TestimonialsSection />

        {/* ─── PARTNER ─── */}
        <section className="relative py-24 md:py-28 z-10 overflow-hidden" aria-labelledby="partner-heading">
          <div className="absolute -right-40 top-0 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[80px] pointer-events-none" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                  <Users className="w-3.5 h-3.5" />
                  Program Mitra
                </div>
                <h2 id="partner-heading" className="text-2xl md:text-3xl font-bold mb-3">
                  Bergabung Sebagai Mitra {siteName}
                </h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Dapatkan penghasilan tambahan dengan menjadi mitra {siteName}.
                  Sistem komisi transparan dengan dashboard real-time.
                </p>

                <ul className="space-y-3 mb-8" role="list">
                  {partnerBenefits.map((text) => (
                    <li key={text} className="flex items-center gap-3 text-sm">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>

                <Button asChild className="h-11 px-6 text-sm font-medium">
                  <Link href="/register">
                    Daftar Mitra Sekarang
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>

              {/* Partner card */}
              <div className="flex justify-center lg:justify-end">
                <div className="w-full max-w-sm relative">
                  {/* Glow behind card */}
                  <div className="absolute -inset-3 bg-primary/[0.06] rounded-[1.5rem] blur-xl" />
                  <div className="relative rounded-2xl border border-border/50 bg-card p-7 text-center shadow-lg shadow-black/[0.03]">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
                      {config.logoUrl && !logoError ? (
                        <img src={config.logoUrl} alt={siteName} className="w-8 h-8 object-contain" onError={() => setLogoError(true)} />
                      ) : (
                        <span className="text-white font-bold text-xl">{getInitials()}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold mb-1">Mitra Dashboard</h3>
                    <p className="text-xs text-muted-foreground mb-6">Kelola transaksi dan pantau profit Anda</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-muted/60 rounded-xl p-3.5 border border-border/30">
                        <p className="text-2xl font-bold text-primary">30%</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Komisi</p>
                      </div>
                      <div className="bg-muted/60 rounded-xl p-3.5 border border-border/30">
                        <p className="text-2xl font-bold text-primary">5jt</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Target</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex items-center justify-center gap-5">
                      {config.footerWhatsapp && (
                        <a href={`https://wa.me/${config.footerWhatsapp}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      )}
                      {config.footerEmail && (
                        <a href={`mailto:${config.footerEmail}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="relative z-10">
          <div className="container mx-auto px-4 pb-8">
            <div className="max-w-3xl mx-auto relative">
              {/* Glow */}
              <div className="absolute -inset-8 bg-primary/[0.08] rounded-[2.5rem] blur-2xl" />

              <div className="relative rounded-3xl bg-gradient-to-br from-primary via-primary to-purple-700 px-6 py-16 md:py-20 text-center overflow-hidden">
                {/* Glass accent */}
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white/[0.06] rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-white/[0.04] rounded-tr-full" />
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                  backgroundSize: '32px 32px',
                }} />

                <div className="relative">
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">Siap Untuk Memulai?</h2>
                  <p className="text-sm md:text-base text-white/80 mb-8 max-w-md mx-auto leading-relaxed">
                    Order sekarang dan dapatkan dana Anda dalam waktu singkat. Proses mudah, transparan, dan aman.
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-w-[280px] mx-auto mb-8">
                    <Button asChild className="h-11 text-sm font-medium bg-white text-primary hover:bg-white/90 shadow-lg shadow-black/20">
                      <Link href="/order">
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        Order
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 text-sm font-medium border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                      <Link href="/track">
                        <Clock className="w-4 h-4 mr-1.5" />
                        Track
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Aman</span>
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Cepat</span>
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Terpercaya</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="py-5 text-center">
          <p className="text-[11px] text-muted-foreground">
            *Biaya ongkir marketplace & layanan tambahan tidak termasuk
          </p>
        </div>

        <style jsx global>{`
          @keyframes shine {
            0% { transform: translateX(-100%) skewX(12deg); }
            50%, 100% { transform: translateX(200%) skewX(12deg); }
          }
        `}</style>
      </div>
    </>
  );
}
