import { Metadata } from 'next';
import LocationListingClient from './client';

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.id';
  
  return {
    title: 'Lokasi Layanan Gestun & Tarik Tunai - Black Bear',
    description: 'Temukan lokasi layanan gestun dan tarik tunai Black Bear di berbagai kota di Indonesia. Layanan cepat, aman, dan terpercaya.',
    keywords: 'gestun, tarik tunai, lokasi gestun, gestun jakarta, gestun surabaya, gestun bandung, tarik tunai kartu kredit, layanan tarik tunai',
    openGraph: {
      title: 'Lokasi Layanan Gestun & Tarik Tunai | Black Bear',
      description: 'Temukan lokasi layanan gestun dan tarik tunai Black Bear di berbagai kota di Indonesia.',
      url: `${siteUrl}/lokasi`,
      type: 'website',
    },
    alternates: {
      canonical: `${siteUrl}/lokasi`,
    },
  };
}

export default async function LocationListingPage() {
  // Fetch locations server-side for SEO
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seo/location?public=true`,
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (result.success && result.data) {
      locations = result.data;
    }
  } catch (error) {
    console.error('Failed to fetch locations:', error);
  }

  return <LocationListingClient initialLocations={locations} />;
}
