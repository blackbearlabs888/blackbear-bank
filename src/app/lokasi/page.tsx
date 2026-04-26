import { Metadata } from 'next';
import { db } from '@/lib/db';
import LocationListingClient from './client';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Lokasi Layanan Gestun & Tarik Tunai di Seluruh Indonesia',
    description: 'Temukan lokasi layanan gestun dan tarik tunai Black Bear di berbagai kota di Indonesia. Tersedia di Jakarta, Surabaya, Bandung, Medan, Semarang, dan kota lainnya. Layanan cepat, aman, terpercaya.',
    keywords: [
      'lokasi gestun', 'tarik tunai lokasi', 'gestun Jakarta', 'gestun Surabaya',
      'gestun Bandung', 'gestun Medan', 'gestun Semarang', 'gestun Makassar',
      'tarik tunai Jakarta', 'tarik tunai Surabaya', 'gestun di Indonesia',
      'layanan gestun terdekat', 'gestun online Indonesia',
      'jasa gestun kota', 'tarik tunai seluruh Indonesia',
    ],
    openGraph: {
      title: 'Lokasi Layanan Gestun & Tarik Tunai di Seluruh Indonesia | Black Bear',
      description: 'Temukan lokasi layanan gestun dan tarik tunai Black Bear di berbagai kota di Indonesia. Layanan cepat, aman, dan terpercaya.',
      url: `${siteUrl}/lokasi`,
      type: 'website',
      locale: 'id_ID',
      siteName: 'Black Bear',
      images: [
        {
          url: `${siteUrl}/og-lokasi.png`,
          width: 1200,
          height: 630,
          alt: 'Lokasi Layanan Gestun Black Bear di Seluruh Indonesia',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Lokasi Layanan Gestun & Tarik Tunai | Black Bear',
      description: 'Temukan lokasi layanan gestun dan tarik tunai Black Bear di berbagai kota di Indonesia.',
      images: [`${siteUrl}/og-lokasi.png`],
    },
    alternates: {
      canonical: `${siteUrl}/lokasi`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function LocationListingPage() {
  // Fetch locations directly from database
  let locations: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    featuredImage: string | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
  }> = [];
  
  try {
    locations = await db.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        featuredImage: true,
        latitude: true,
        longitude: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch locations:', error);
  }

  return <LocationListingClient initialLocations={locations} />;
}
