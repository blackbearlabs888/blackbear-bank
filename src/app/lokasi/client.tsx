'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { MapPin, ArrowRight, Search, Navigation, ExternalLink } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import MapProvider from '@/components/map/map-provider';
import { useRouter } from 'next/navigation';

interface Location {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featuredImage: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}

interface LocationListingClientProps {
  initialLocations: Location[];
}

export default function LocationListingClient({ initialLocations }: LocationListingClientProps) {
  const { config } = useSiteConfig();
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  
  const siteName = config.websiteTitle || 'Black Bear';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

  // Filter locations based on search
  const filteredLocations = initialLocations.filter(location => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      location.name.toLowerCase().includes(query) ||
      (location.description && location.description.toLowerCase().includes(query))
    );
  });

  // Get locations with coordinates for map
  const mappedLocations = filteredLocations.filter(loc => loc.latitude && loc.longitude);

  // Handle marker click
  const handleMarkerClick = (location: Location) => {
    router.push(`/lokasi/${location.slug}`);
  };

  // Generate ItemList JSON-LD for SEO
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Lokasi Layanan ${siteName}`,
    description: `Daftar lokasi layanan gestun dan tarik tunai ${siteName} di Indonesia`,
    numberOfItems: filteredLocations.length,
    itemListElement: filteredLocations.map((location, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `Gestun ${location.name}`,
      description: location.description || `Layanan gestun dan tarik tunai di ${location.name}`,
      url: `${siteUrl}/lokasi/${location.slug}`,
    })),
  };

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Lokasi',
        item: `${siteUrl}/lokasi`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute top-0 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Lokasi</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="max-w-3xl">
            <div className="w-16 h-16 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Lokasi Layanan <span className="text-primary">{siteName}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Temukan layanan gestun dan tarik tunai {siteName} di berbagai kota di Indonesia. 
              Proses cepat, aman, dan terpercaya.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      {mappedLocations.length > 0 && (
        <section className="py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#1a1a2e]">
                {/* Map Container */}
                <div className="relative aspect-[2.2/1] min-h-[400px]">
                  <div
                    ref={mapContainerRef}
                    className="absolute inset-0 h-full w-full"
                  />
                  
                  {/* Map Provider */}
                  <MapProvider
                    mapContainerRef={mapContainerRef}
                    locations={mappedLocations}
                    onMarkerClick={handleMarkerClick}
                    onMarkerHover={setHoveredLocation}
                  />

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-lg border border-zinc-700/50 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
                      <span className="text-xs text-zinc-300 font-medium">Lokasi Aktif</span>
                    </div>
                    <span className="text-zinc-600">|</span>
                    <span className="text-xs text-zinc-400">{mappedLocations.length} Kota</span>
                  </div>

                  {/* Map attribution */}
                  <div className="absolute bottom-4 right-4 text-[10px] text-zinc-500 z-10">
                    © CARTO © OSM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search Section */}
      <section className="py-6 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {filteredLocations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lokasi Tidak Ditemukan</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery
                  ? 'Tidak ada lokasi yang sesuai dengan pencarian Anda.'
                  : 'Lokasi layanan akan segera hadir di kota Anda.'}
              </p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="text-center mb-8">
                <p className="text-muted-foreground">
                  Menampilkan <span className="font-medium text-foreground">{filteredLocations.length}</span> lokasi
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {filteredLocations.map((location) => {
                  const isHovered = hoveredLocation === location.id;
                  return (
                    <Link 
                      key={location.id} 
                      href={`/lokasi/${location.slug}`} 
                      className="group"
                      onMouseEnter={() => setHoveredLocation(location.id)}
                      onMouseLeave={() => setHoveredLocation(null)}
                    >
                      <Card className={`h-full overflow-hidden transition-all duration-300 border-border/50 hover:border-orange-500/30 ${isHovered ? 'ring-2 ring-orange-500/30 shadow-lg' : 'hover:shadow-lg'}`}>
                        {/* Featured Image or Color Bar */}
                        <div className="relative h-40 bg-muted overflow-hidden">
                          {location.featuredImage ? (
                            <img
                              src={location.featuredImage}
                              alt={`Gestun ${location.name}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/10">
                              <Navigation className="w-12 h-12 text-orange-500/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">
                              {location.name}
                            </h2>
                            <div className={cn(
                              "w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 transition-transform",
                              isHovered && "scale-125"
                            )} />
                          </div>
                        </div>

                        <CardContent className="p-4">
                          {location.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {location.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-orange-500 font-medium">
                              Gestun {location.name}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-2">
              Tidak Ada Lokasi di Kota Anda?
            </h2>
            <p className="text-muted-foreground mb-6">
              Layanan kami tersedia secara online. Anda bisa melakukan transaksi dari mana saja di Indonesia.
            </p>
            <Button asChild>
              <Link href="/order">
                Order Sekarang
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper function for conditional classnames
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
