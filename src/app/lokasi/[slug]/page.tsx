import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
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

    if (!location) {
      return {
        title: 'Lokasi Tidak Ditemukan',
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.id';
    
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

    if (result) {
      location = result;
    }
  } catch (error) {
    console.error('Failed to fetch location:', error);
  }

  if (!location) {
    notFound();
  }

  return <LocationDetailClient location={location} />;
}
