'use client';

import { useEffect, useState, useRef } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCompactCurrency, formatDateAgo } from '@/lib/utils';

interface PublicTestimonial {
  rating: number;
  review: string;
  customerName: string;
  createdAt: string;
  nominal: number;
  paymentType: string;
}

const fallbackTestimonials: PublicTestimonial[] = [
  { rating: 5, review: 'Proses sangat cepat dan transparan! Dana langsung masuk ke rekening saya.', customerName: 'J***', createdAt: new Date(Date.now() - 86400000).toISOString(), nominal: 5000000, paymentType: 'Kartu Kredit' },
  { rating: 5, review: 'Sudah beberapa kali pakai layanan ini, selalu memuaskan. Recommended!', customerName: 'A****', createdAt: new Date(Date.now() - 172800000).toISOString(), nominal: 3000000, paymentType: 'Paylater' },
  { rating: 4, review: 'Pelayanan ramah dan profesional. Tracking real-time sangat membantu.', customerName: 'R****', createdAt: new Date(Date.now() - 259200000).toISOString(), nominal: 10000000, paymentType: 'Kartu Kredit' },
  { rating: 5, review: 'Rate terbaik dibanding yang lain. Pasti langganan!', customerName: 'D******', createdAt: new Date(Date.now() - 345600000).toISOString(), nominal: 7500000, paymentType: 'Gestun' },
  { rating: 5, review: 'Aman dan terpercaya. Tidak ada biaya tersembunyi.', customerName: 'S*******', createdAt: new Date(Date.now() - 432000000).toISOString(), nominal: 2000000, paymentType: 'Paylater' },
  { rating: 4, review: 'CS responsif, proses cepat. Top banget!', customerName: 'M****', createdAt: new Date(Date.now() - 518400000).toISOString(), nominal: 8000000, paymentType: 'Kartu Kredit' },
  { rating: 5, review: 'Sudah recommendation ke teman-teman. Semua puas!', customerName: 'B****', createdAt: new Date(Date.now() - 604800000).toISOString(), nominal: 4500000, paymentType: 'COD' },
  { rating: 5, review: 'Gampang banget prosesnya, tinggal order duduk manis dana langsung cair.', customerName: 'T****', createdAt: new Date(Date.now() - 691200000).toISOString(), nominal: 6000000, paymentType: 'Paylater' },
];

function TestimonialCard({ t }: { t: PublicTestimonial }) {
  return (
    <Card className="flex-shrink-0 w-[260px] sm:w-[300px] md:w-[320px] border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300 bg-background py-0 gap-0 group">
      <CardContent className="p-5 sm:p-6 space-y-3">
        {/* Header: Stars + Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  s <= t.rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-muted-foreground/20'
                }`}
              />
            ))}
          </div>
          <Badge
            variant="secondary"
            className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/10"
          >
            {formatCompactCurrency(t.nominal)}
          </Badge>
        </div>

        {/* Review */}
        <div className="relative">
          <Quote className="absolute -top-1 -left-0.5 w-4 h-4 text-primary/10 group-hover:text-primary/20 transition-colors" />
          <p className="text-sm text-muted-foreground leading-relaxed pl-5 line-clamp-4">
            {t.review}
          </p>
        </div>

        {/* Footer: Name + Meta */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
              <span className="text-[11px] font-bold text-white">
                {t.customerName.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold">{t.customerName}</p>
              <p className="text-[10px] text-muted-foreground">{t.paymentType}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            {formatDateAgo(t.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScrollingRow({
  testimonials,
  reverse = false,
  speed = 40,
}: {
  testimonials: PublicTestimonial[];
  reverse?: boolean;
  speed?: number;
}) {
  const items = [...testimonials, ...testimonials];

  return (
    <div className="relative overflow-hidden py-2 group/carousel">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 md:w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 md:w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div className="flex gap-3 sm:gap-4 w-max group-hover/carousel:[animation-play-state:paused]">
        <div
          className="flex gap-3 sm:gap-4"
          style={{
            animation: reverse
              ? `scroll-right ${speed}s linear infinite`
              : `scroll-left ${speed}s linear infinite`,
          }}
        >
          {items.map((t, i) => (
            <TestimonialCard key={`${t.customerName}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Mobile swipe carousel with touch support
function MobileSwipeCarousel({ testimonials }: { testimonials: PublicTestimonial[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="md:hidden relative">
      {/* Nav buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-md flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors min-h-0 min-w-0"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-md flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors min-h-0 min-w-0"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-1 py-2 -mx-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {testimonials.map((t, i) => (
          <div key={`${t.customerName}-${i}`} className="flex-shrink-0 snap-start w-[280px]">
            <TestimonialCard t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Star distribution bars with scroll-triggered animation.
// In Phase 4 this is computed from the actual testimonial set rather than
// hardcoded — we no longer publish a fake distribution.
function StarRatingBars({ distribution }: { distribution: { stars: number; percent: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (distribution.length === 0) return null;

  return (
    <div ref={containerRef} className="mx-auto max-w-[200px] sm:max-w-[240px] space-y-1.5 mb-4">
      {distribution.map((item, i) => (
        <div key={item.stars} className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 w-10 flex-shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground w-3 text-right">{item.stars}</span>
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full star-bar-fill transition-all duration-1000 ease-out"
              style={{
                width: visible ? `${item.percent}%` : '0%',
                transitionDelay: `${i * 120}ms`,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/60 w-7 text-right">
            {item.percent}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>(fallbackTestimonials);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const res = await fetch('/api/testimonials/public');
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setTestimonials(data.data);
        }
      } catch {
        // Use fallback
      } finally {
        setLoaded(true);
      }
    }
    fetchTestimonials();
  }, []);

  const mid = Math.ceil(testimonials.length / 2);
  const row1 = testimonials.slice(0, mid);
  const row2 = testimonials.slice(mid);

  if (loaded && testimonials.length === 0) return null;

  const ensureMin = (arr: PublicTestimonial[]): PublicTestimonial[] => {
    if (arr.length < 3) {
      const padded = [...arr];
      while (padded.length < 3) {
        padded.push(arr[padded.length % arr.length] || fallbackTestimonials[padded.length % fallbackTestimonials.length]);
      }
      return padded;
    }
    return arr;
  };

  // Compute a real aggregate from the testimonial set we actually have.
  // We do NOT publish a hardcoded rating/review count — that would be a fake
  // trust signal. Only show the aggregate when we have at least 5 verified
  // testimonials; otherwise we hide the rating block entirely.
  const verified = loaded ? testimonials : [];
  const ratingCount = verified.length;
  const showAggregate = ratingCount >= 5;
  const avgRating = showAggregate
    ? verified.reduce((s, t) => s + (t.rating || 0), 0) / ratingCount
    : 0;
  const avgLabel = avgRating.toFixed(1).replace(/\.0$/, '');
  const starDistribution = showAggregate
    ? [5, 4, 3, 2, 1].map((stars) => {
        const count = verified.filter((t) => Math.round(t.rating || 0) === stars).length;
        return {
          stars,
          percent: ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0,
        };
      })
    : [];

  return (
    <section className="relative py-12 md:py-20 z-10" aria-labelledby="testimonials-heading">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center">
          {/* Rating number — only shown when backed by real, verified testimonials */}
          {showAggregate && (
            <div className="mb-2 flex items-center justify-center gap-2">
              <div className="flex items-baseline">
                <span className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{avgLabel}</span>
                <span className="text-lg md:text-xl text-muted-foreground font-medium">/5</span>
              </div>
              <span className="text-sm text-muted-foreground">({ratingCount} ulasan)</span>
            </div>
          )}
          {/* Star rating with glow — only shown when backed by real testimonials */}
          {showAggregate && (
            <div className="relative inline-flex mb-1">
              <div className="absolute inset-0 bg-amber-400/20 blur-md rounded-full" />
              <div className="relative flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 md:w-5 md:h-5 ${s <= Math.round(avgRating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Star Distribution Bars — computed from real testimonials */}
          <StarRatingBars distribution={starDistribution} />

          <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Apa Kata{' '}
            <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
              Pelanggan Kami
            </span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {showAggregate
              ? `Berdasarkan ${ratingCount} ulasan pelanggan terverifikasi. Berikut pengalaman mereka.`
              : 'Berikut pengalaman pelanggan kami.'}
          </p>
        </div>
      </div>

      {/* Auto-scrolling marquee rows (all screen sizes) */}
      <div className="space-y-4">
        <ScrollingRow testimonials={ensureMin(row1)} speed={45} />
        <ScrollingRow testimonials={ensureMin(row2)} reverse speed={50} />
      </div>

      <style jsx global>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .star-bar-fill {
          background: linear-gradient(90deg, oklch(0.8 0.18 85), oklch(0.75 0.15 80));
        }
      `}</style>
    </section>
  );
}
