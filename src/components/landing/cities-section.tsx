'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, ChevronRight, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { FadeInSection } from '@/components/landing/fade-in-section';
import { Input } from '@/components/ui/input';

interface City {
  name: string;
  slug: string;
  description?: string;
}

// Fallback cities jika API gagal
const fallbackCities: City[] = [
  { name: 'Jakarta', slug: 'jakarta' },
  { name: 'Surabaya', slug: 'surabaya' },
  { name: 'Bandung', slug: 'bandung' },
  { name: 'Semarang', slug: 'semarang' },
  { name: 'Medan', slug: 'medan' },
  { name: 'Bekasi', slug: 'bekasi' },
  { name: 'Tangerang', slug: 'tangerang' },
  { name: 'Depok', slug: 'depok' },
  { name: 'Makassar', slug: 'makassar' },
  { name: 'Yogyakarta', slug: 'yogyakarta' },
  { name: 'Denpasar', slug: 'denpasar' },
  { name: 'Malang', slug: 'malang' },
];

export default function CitiesSection() {
  const [cities, setCities] = useState<City[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch cities dari DB via API
  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch('/api/seo/location?public=true');
        const result = await res.json();
        if (result.success && result.data && result.data.length > 0) {
          setCities(result.data.map((loc: { name: string; slug: string; description?: string }) => ({
            name: loc.name,
            slug: loc.slug,
            description: loc.description,
          })));
        } else {
          setCities(fallbackCities);
        }
      } catch {
        setCities(fallbackCities);
      } finally {
        setLoading(false);
      }
    }
    fetchCities();
  }, []);

  const INITIAL_SHOW = 8;

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    return cities.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, cities]);

  const displayCities = useMemo(() => {
    if (searchQuery.trim()) return filteredCities;
    return showAll ? filteredCities : filteredCities.slice(0, INITIAL_SHOW);
  }, [searchQuery, filteredCities, showAll]);

  const hasMore = !searchQuery.trim() && filteredCities.length > INITIAL_SHOW;

  // Use a stable display count to avoid "0+" flash
  const displayCount = loading ? 100 : cities.length;

  return (
    <section className="relative py-12 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          {/* Section Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5 text-primary text-sm font-medium mb-4">
              <MapPin className="w-3.5 h-3.5" />
              <span>Cakupan Area</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
              Layanan di Seluruh Indonesia
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Tersedia di{' '}
              {loading ? (
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-12 h-4 bg-muted rounded-full overflow-hidden relative">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  </span>
                  <span className="text-muted-foreground">+ kota</span>
                </span>
              ) : (
                <span className="font-semibold text-foreground">{displayCount}+ kota</span>
              )}{' '}
              besar di Indonesia. Transaksi aman dari mana saja.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kota Anda..."
                aria-label="Cari kota layanan"
                className="pl-10 h-11 rounded-xl border-border/60 bg-background/80 backdrop-blur-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Memuat lokasi...</span>
            </div>
          ) : (
            <>
              {/* Cities Grid */}
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {displayCities.map((city, i) => (
                    <Link
                      key={city.slug}
                      href={`/lokasi/${city.slug}`}
                      className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm hover:border-primary/25 hover:bg-primary/[0.03] transition-all duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-safe:hover:shadow-primary/5 motion-safe:hover:ring-1 motion-safe:hover:ring-primary/10"
                      style={{
                        animationDelay: `${i * 30}ms`,
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{city.name}</p>
                        <p className="text-[10px] text-muted-foreground">Layanan gestun</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </Link>
                  ))}
                </div>

                {/* Show more / Show less */}
                {hasMore && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/25 hover:bg-primary/[0.03] transition-all duration-300"
                    >
                      {showAll ? 'Tampilkan Sedikit' : 'Lihat Semua Kota'}
                      <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                )}

                {/* Not found */}
                {searchQuery.trim() && displayCities.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Kota &ldquo;{searchQuery}&rdquo; belum tersedia.
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Hubungi kami via WhatsApp untuk layanan di kota Anda.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bottom note */}
          <div className="text-center mt-8">
            <p className="text-xs text-muted-foreground/60">
              Tidak menemukan kota Anda?{' '}
              <Link href="/lokasi" className="text-primary hover:underline underline-offset-2">
                Lihat semua lokasi
              </Link>
              {' '}atau hubungi kami via WhatsApp.
            </p>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
