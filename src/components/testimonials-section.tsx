'use client';

import { useEffect, useState, useRef } from 'react';
import { Star, Quote, MessageCircle } from 'lucide-react';
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

// Fallback testimonials when API is empty or loading
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
    <Card className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[260px] border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-white to-white/80 dark:from-gray-900 dark:to-gray-900/80">
      <CardContent className="p-3 sm:p-3.5 space-y-2">
        {/* Header: Stars + Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3 h-3 ${
                  s <= t.rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-muted-foreground/20'
                }`}
              />
            ))}
          </div>
          <Badge
            variant="secondary"
            className="text-[9px] px-1.5 py-0 rounded-full bg-primary/10 text-primary font-medium leading-tight"
          >
            {formatCompactCurrency(t.nominal)}
          </Badge>
        </div>

        {/* Review */}
        <div className="relative">
          <Quote className="absolute -top-0.5 -left-0 w-3 h-3 text-primary/15" />
          <p className="text-xs text-muted-foreground leading-relaxed pl-3.5 line-clamp-2">
            {t.review}
          </p>
        </div>

        {/* Footer: Name + Meta */}
        <div className="flex items-center justify-between pt-1.5 border-t border-muted/50">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-white">
                {t.customerName.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold truncate">{t.customerName}</p>
              <p className="text-[9px] text-muted-foreground">{t.paymentType}</p>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/60 flex-shrink-0">
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
  // Duplicate items for seamless loop
  const items = [...testimonials, ...testimonials];

  return (
    <div className="relative overflow-hidden py-1 group/carousel">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Scrolling container */}
      <div className="flex gap-2.5 w-max group-hover/carousel:[animation-play-state:paused]">
        <div
          className="flex gap-2.5"
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

  // Split into two rows
  const mid = Math.ceil(testimonials.length / 2);
  const row1 = testimonials.slice(0, mid);
  const row2 = testimonials.slice(mid);

  // If only one item, show fallback
  if (loaded && testimonials.length === 0) return null;

  // Ensure both rows have at least 3 items for smooth scrolling
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

  return (
    <section className="relative py-12 md:py-16 bg-muted/30 backdrop-blur-sm z-10" aria-labelledby="testimonials-heading">
      <div className="container mx-auto px-4 mb-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium mb-3">
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Testimoni</span>
          </div>
          <h2 id="testimonials-heading" className="text-2xl md:text-3xl font-bold mb-2">
            Apa Kata Pelanggan Kami
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Ribuan pelanggan puas dengan layanan kami.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <ScrollingRow testimonials={ensureMin(row1)} speed={45} />
        <ScrollingRow testimonials={ensureMin(row2)} reverse speed={50} />
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
