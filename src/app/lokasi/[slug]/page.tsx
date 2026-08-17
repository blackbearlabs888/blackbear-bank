import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { safeJsonLd } from '@/lib/json-ld-safe';
import LocationDetailClient from './client';

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

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const location = await db.location.findUnique({
      where: { slug },
    });

    // Inactive locations must not be indexed — treat as not-found for SEO.
    if (!location || !location.isActive) {
      return {
        title: 'Lokasi Tidak Ditemukan',
        robots: { index: false, follow: true },
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
    
    const title = location.metaTitle || `Gestun ${location.name} - Layanan Tarik Tunai Terpercaya`;
    const description = location.metaDescription || location.description || `Layanan gestun dan tarik tunai terpercaya di ${location.name}. Proses cepat, aman, dan transparan.`;
    
    return {
      title,
      description,
      keywords: location.keywords || `gestun ${location.name.toLowerCase()}, tarik tunai ${location.name.toLowerCase()}, layanan gestun, tarik tunai kartu kredit`,
      openGraph: {
        type: 'website',
        title,
        description,
        url: `${siteUrl}/lokasi/${location.slug}`,
        images: location.featuredImage ? [{ url: location.featuredImage }] : undefined,
        locale: 'id_ID',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: location.featuredImage ? [location.featuredImage] : undefined,
      },
      alternates: {
        canonical: `${siteUrl}/lokasi/${location.slug}`,
      },
    };
  } catch {
    return {
      title: 'Lokasi',
    };
  }
}

// Phase 4: ISR — location detail pages change infrequently, revalidate hourly.
export const revalidate = 3600;

// Generate static params for build
export async function generateStaticParams() {
  try {
    const locations = await db.location.findMany({
      where: { isActive: true },
      select: { slug: true },
    });

    return locations.map((location) => ({
      slug: location.slug,
    }));
  } catch {
    console.error('Failed to generate static params for locations');
    return [];
  }
}

export default async function LocationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch location directly from database
  let location: Location | null = null;

  try {
    const result = await db.location.findUnique({
      where: { slug },
    });

    // Inactive locations must not render (soft-404 → notFound()).
    if (result && result.isActive) {
      // Defense-in-depth: sanitize HTML content on read so legacy rows
      // written before write-time sanitization are also safe.
      location = {
        ...result,
        content: result.content ? sanitizeHtml(result.content) : null,
      };
    }
  } catch (error) {
    console.error('Failed to fetch location:', error);
  }

  if (!location) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

  // Fetch the real business phone number from OwnerProfile (not a hardcoded
  // placeholder) for the LocalBusiness JSON-LD.
  let businessPhone: string | null = null;
  try {
    const ownerProfile = await db.ownerProfile.findFirst();
    businessPhone = ownerProfile?.footerWhatsapp || null;
  } catch {
    // If OwnerProfile is unavailable, omit telephone from JSON-LD.
  }

  // LocalBusiness JSON-LD for this specific location
  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}/lokasi/${location.slug}`,
    name: `Black Bear - ${location.name}`,
    description: location.description || `Layanan gestun dan tarik tunai terpercaya di ${location.name}. Proses cepat, aman, dan transparan.`,
    url: `${siteUrl}/lokasi/${location.slug}`,
    image: location.featuredImage || `${siteUrl}/og-lokasi.png`,
    ...(businessPhone ? { telephone: businessPhone } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: location.name,
      addressCountry: 'ID',
    },
    ...(location.latitude && location.longitude ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: location.latitude,
        longitude: location.longitude,
      },
    } : {}),
    openingHours: 'Mo-Su 00:00-23:59',
    priceRange: '$$',
    serviceType: ['Gestun', 'Tarik Tunai Kartu Kredit', 'Tarik Tunai Paylater', 'COD'],
    areaServed: {
      '@type': 'City',
      name: location.name,
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
        item: `${siteUrl}/lokasi/${location.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <LocationDetailClient location={location} />
    </>
  );
}
