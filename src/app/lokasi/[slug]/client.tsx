'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { MapPin, ArrowLeft, ArrowRight, MessageCircle, CreditCard, Wallet, Shield, Clock, CheckCircle } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';

interface Location {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string | null;
  featuredImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface LocationDetailClientProps {
  location: Location;
}

const services = [
  {
    icon: CreditCard,
    title: 'Kartu Kredit',
    description: 'Tarik tunai dari semua jenis kartu kredit',
  },
  {
    icon: Wallet,
    title: 'Paylater',
    description: 'GoPay, Shopee, Akulaku & platform paylater lainnya',
  },
];

const benefits = [
  { icon: Shield, text: 'Aman & Terpercaya' },
  { icon: Clock, text: 'Proses Cepat' },
  { icon: CheckCircle, text: 'Transparan' },
];

export default function LocationDetailClient({ location }: LocationDetailClientProps) {
  const { config } = useSiteConfig();
  
  const siteName = config.websiteTitle || 'Black Bear';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  const locationUrl = `${siteUrl}/lokasi/${location.slug}`;

  const handleOrderWhatsApp = () => {
    const message = `Halo, saya ingin melakukan transaksi gestun di ${location.name}`;
    const url = config.footerWhatsapp 
      ? `https://wa.me/${config.footerWhatsapp}?text=${encodeURIComponent(message)}`
      : null;
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Generate LocalBusiness JSON-LD
  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${locationUrl}#localbusiness`,
    name: `${siteName} ${location.name}`,
    description: location.description || `Layanan gestun dan tarik tunai terpercaya di ${location.name}`,
    url: locationUrl,
    image: location.featuredImage || config.logoUrl || undefined,
    telephone: config.footerWhatsapp ? `+62${config.footerWhatsapp.replace(/^0/, '')}` : undefined,
    email: config.footerEmail || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: location.name,
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '-6.2088',
      longitude: '106.8456',
    },
    openingHours: 'Mo-Su 00:00-23:59',
    priceRange: '$$',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '500',
    },
    areaServed: {
      '@type': 'City',
      name: location.name,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Layanan Tarik Tunai',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Gestun Kartu Kredit',
            description: `Layanan tarik tunai kartu kredit di ${location.name}`,
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Gestun Paylater',
            description: `Layanan tarik tunai paylater di ${location.name}`,
          },
        },
      ],
    },
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
      {
        '@type': 'ListItem',
        position: 3,
        name: location.name,
        item: locationUrl,
      },
    ],
  };

  // Parse keywords for tags
  const keywords = location.keywords ? location.keywords.split(',').map(k => k.trim()) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl opacity-50" />

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
                <BreadcrumbLink asChild>
                  <Link href="/lokasi">Lokasi</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{location.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">
                Layanan Tersedia
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Gestun <span className="text-primary">{location.name}</span>
            </h1>

            {location.description && (
              <p className="text-lg text-muted-foreground mb-6">
                {location.description}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="h-12">
                <Link href="/order">
                  Order Sekarang
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              {config.footerWhatsapp && (
                <Button variant="outline" size="lg" className="h-12 gap-2" onClick={handleOrderWhatsApp}>
                  <MessageCircle className="w-4 h-4" />
                  Hubungi WhatsApp
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {location.featuredImage && (
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-xl overflow-hidden bg-muted">
                <img
                  src={location.featuredImage}
                  alt={`Gestun ${location.name}`}
                  className="w-full h-auto max-h-[400px] object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Services Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Layanan di {location.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((service, index) => {
                const ServiceIcon = service.icon;
                return (
                  <Card key={index} className="border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ServiceIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{service.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      {location.content && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardContent className="p-6 md:p-8">
                  <div 
                    className="prose prose-lg dark:prose-invert max-w-none
                      prose-headings:font-bold prose-headings:tracking-tight
                      prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4
                      prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-3
                      prose-p:text-muted-foreground prose-p:leading-relaxed
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-ul:my-4 prose-ol:my-4
                      prose-li:text-muted-foreground
                    "
                    dangerouslySetInnerHTML={{ __html: location.content.replace(/\n/g, '<br />') }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Mengapa Memilih Kami?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {benefits.map((benefit, index) => {
                const BenefitIcon = benefit.icon;
                return (
                  <Card key={index} className="border-border/50 text-center">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <BenefitIcon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold">{benefit.text}</h3>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Keywords/Tags */}
      {keywords.length > 0 && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Kata Kunci:</h3>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 via-background to-purple-500/10 border-border/50">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">
                  Siap Untuk Transaksi?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Order sekarang dan dapatkan dana Anda dalam waktu singkat
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/order">
                      Order Sekarang
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  {config.footerWhatsapp && (
                    <Button variant="outline" size="lg" onClick={handleOrderWhatsApp} className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Back to Locations */}
      <section className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="ghost" className="gap-2">
              <Link href="/lokasi">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Lokasi
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
