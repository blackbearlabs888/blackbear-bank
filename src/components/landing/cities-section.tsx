'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { FadeInSection } from '@/components/landing/fade-in-section';

interface City {
  name: string;
  slug: string;
  count?: number;
}

const popularCities: City[] = [
  { name: 'Jakarta', slug: 'jakarta', count: 3240 },
  { name: 'Surabaya', slug: 'surabaya', count: 1890 },
  { name: 'Bandung', slug: 'bandung', count: 1560 },
  { name: 'Semarang', slug: 'semarang', count: 1120 },
  { name: 'Medan', slug: 'medan', count: 980 },
  { name: 'Bekasi', slug: 'bekasi', count: 870 },
  { name: 'Tangerang', slug: 'tangerang', count: 760 },
  { name: 'Depok', slug: 'depok', count: 650 },
  { name: 'Makassar', slug: 'makassar', count: 540 },
  { name: 'Yogyakarta', slug: 'yogyakarta', count: 480 },
  { name: 'Denpasar', slug: 'denpasar', count: 420 },
  { name: 'Malang', slug: 'malang', count: 380 },
];

const moreCities: City[] = [
  { name: 'Palembang', slug: 'palembang', count: 320 },
  { name: 'Manado', slug: 'manado', count: 280 },
  { name: 'Balikpapan', slug: 'balikpapan', count: 260 },
  { name: 'Pontianak', slug: 'pontianak', count: 240 },
  { name: 'Banjarmasin', slug: 'banjarmasin', count: 220 },
  { name: 'Pekanbaru', slug: 'pekanbaru', count: 200 },
];

export default function CitiesSection() {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPopular = useMemo(() => {
    if (!searchQuery.trim()) return popularCities;
    return popularCities.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const allCities = useMemo(() => {
    if (showAll) return [...popularCities, ...moreCities];
    return popularCities;
  }, [showAll]);

  const filteredAll = useMemo(() => {
    if (!searchQuery.trim()) return allCities;
    return allCities.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allCities]);

  const displayCities = searchQuery.trim() ? filteredPopular : filteredAll;

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
              Tersedia di 30+ kota besar di Indonesia. Transaksi aman dari mana saja.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kota Anda..."
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all outline-none placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Cities Grid */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {displayCities.map((city, i) => (
                <Link
                  key={city.slug}
                  href={`/lokasi/${city.slug}`}
                  className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm hover:border-primary/25 hover:bg-primary/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5"
                  style={{
                    animationDelay: `${i * 30}ms`,
                  }}
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{city.name}</p>
                    <p className="text-[10px] text-muted-foreground">{city.count?.toLocaleString('id-ID')}+ transaksi</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>

            {/* Show more / Show less */}
            {!searchQuery.trim() && (
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
