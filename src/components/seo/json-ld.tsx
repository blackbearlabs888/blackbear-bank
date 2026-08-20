'use client';

import { useSiteConfig } from '@/hooks/use-site-config';
import { safeJsonLd } from '@/lib/json-ld-safe';

/**
 * JSON-LD Structured Data for SEO
 * Provides rich snippets in Google search results
 */
export function OrganizationJsonLd() {
  const { config } = useSiteConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  const siteName = config.websiteTitle || 'Black Bear';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: siteName,
    description: config.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman.',
    url: siteUrl,
    logo: config.logoUrl || `${siteUrl}/logo.png`,
    image: config.logoUrl || `${siteUrl}/logo.png`,
    telephone: config.footerWhatsapp ? `+62${config.footerWhatsapp.replace(/^0/, '')}` : undefined,
    email: config.footerEmail || undefined,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ID',
      addressLocality: 'Indonesia',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '-6.2088',
      longitude: '106.8456',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ],
      opens: '00:00',
      closes: '23:59',
    },
    priceRange: '$$',
    // NOTE: aggregateRating removed in Phase 4 — we do not publish a verified
    // aggregate rating/review count, so emitting one would be a fake signal
    // that damages trust. Re-add ONLY when backed by verified review data.
    sameAs: [
      config.footerInstagram,
      config.footerFacebook,
      config.footerTiktok,
      config.footerYoutube,
      config.footerThreads,
    ].filter(Boolean),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Layanan Tarik Tunai',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Tarik Tunai Kartu Kredit',
            description: 'Layanan tarik tunai dari semua jenis kartu kredit dengan proses cepat dan aman.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Tarik Tunai Paylater',
            description: 'Tarik tunai dari GoPay Paylater, Shopee Paylater, Akulaku, dan platform paylater lainnya.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'COD (Cash on Delivery)',
            description: 'Layanan tarik tunai dengan metode COD untuk kemudahan transaksi.',
          },
        },
      ],
    },
    areaServed: {
      '@type': 'Country',
      name: 'Indonesia',
    },
    serviceType: ['Tarik Tunai', 'Gestun', 'Pencairan Dana'],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
    />
  );
}

/**
 * FAQ Schema for FAQ rich snippets
 */
export function FAQJsonLd() {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Apa itu layanan tarik tunai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Layanan pencairan dana dari limit kartu kredit atau paylater. Prosedur verifikasi data berstruktur dengan biaya yang ditampilkan di kalkulator.',
        },
      },
      {
        '@type': 'Question',
        name: 'Berapa lama proses tarik tunai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Proses pencairan dimulai setelah verifikasi data selesai. Estimasi waktu akan diberikan setelah verifikasi. Dana ditransfer ke rekening yang Anda tentukan.',
        },
      },
      {
        '@type': 'Question',
        name: 'Apakah layanan ini aman?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Layanan kami menerapkan prosedur verifikasi data berstruktur. Setiap transaksi dapat dilacak melalui sistem tracking order, dan data disimpan dengan enkripsi.',
        },
      },
      {
        '@type': 'Question',
        name: 'Apa saja metode pembayaran yang didukung?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Metode yang didukung mencakup pencairan limit kartu kredit, pencairan limit paylater dari provider yang aktif terdaftar, dan COD (Cash on Delivery). Daftar provider paylater aktif dapat dilihat di kalkulator biaya.',
        },
      },
      {
        '@type': 'Question',
        name: 'Bagaimana cara menjadi mitra?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Untuk menjadi mitra, daftar melalui halaman registrasi mitra. Anda akan mendapatkan komisi hingga 30% dari setiap transaksi, dashboard real-time, dan support tim profesional.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(faqData) }}
    />
  );
}

/**
 * Breadcrumb Schema
 */
export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; url: string }> }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbData) }}
    />
  );
}

/**
 * Local Business Schema
 */
export function LocalBusinessJsonLd() {
  const { config } = useSiteConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  const siteName = config.websiteTitle || 'Black Bear';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}/#organization`,
    name: siteName,
    description: config.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater.',
    url: siteUrl,
    telephone: config.footerWhatsapp ? `+62${config.footerWhatsapp.replace(/^0/, '')}` : undefined,
    email: config.footerEmail || undefined,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ID',
      addressLocality: 'Indonesia',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '-6.2088',
      longitude: '106.8456',
    },
    openingHours: 'Mo-Su 00:00-23:59',
    priceRange: '$$',
    image: config.logoUrl || `${siteUrl}/logo.png`,
    sameAs: [
      config.footerInstagram,
      config.footerFacebook,
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
    />
  );
}
