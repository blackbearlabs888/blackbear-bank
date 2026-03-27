import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCityCoordinates, generateLocationContent } from '@/lib/indonesia-cities';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// POST - Sync partner cities to locations (owner only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all unique cities from active partners
    const partners = await db.partner.findMany({
      where: { status: 'active' },
      select: { city: true },
    });

    // Get unique cities
    const uniqueCities = [...new Set(partners.map(p => p.city.trim()).filter(Boolean))];
    
    // Get existing locations
    const existingLocations = await db.location.findMany({
      select: { slug: true },
    });
    const existingSlugs = new Set(existingLocations.map(l => l.slug));

    let created = 0;
    let skipped = 0;
    let noCoords = 0;
    const createdLocations: string[] = [];

    for (const city of uniqueCities) {
      const slug = generateSlug(city);
      
      // Skip if already exists
      if (existingSlugs.has(slug)) {
        skipped++;
        continue;
      }

      // Get coordinates from library
      const coords = getCityCoordinates(city);
      
      // Generate SEO content
      const content = generateLocationContent(city, coords.province);

      // Create location with full content
      await db.location.create({
        data: {
          name: city,
          slug,
          description: content.description,
          content: content.content,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          keywords: content.keywords,
          latitude: coords.lat,
          longitude: coords.lng,
          isActive: true,
        },
      });
      
      created++;
      createdLocations.push(city);
      
      if (!coords.lat || !coords.lng) {
        noCoords++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync berhasil! ${created} lokasi baru dibuat, ${skipped} lokasi sudah ada.${noCoords > 0 ? ` ${noCoords} lokasi tanpa koordinat (perlu input manual).` : ''}`,
      data: {
        created,
        skipped,
        noCoords,
        totalPartners: partners.length,
        uniqueCities: uniqueCities.length,
        createdLocations,
      },
    });
  } catch (error) {
    console.error('Sync locations error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
