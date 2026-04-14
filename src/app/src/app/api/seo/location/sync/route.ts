import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCityData, generateLocationContent } from '@/lib/city-utils';

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
      select: { city: true, name: true },
    });

    console.log('Found partners:', partners.length);
    console.log('Partner cities:', partners.map(p => ({ name: p.name, city: p.city })));

    // Get unique cities (trim and filter empty)
    const uniqueCities = [...new Set(partners.map(p => p.city.trim()).filter(Boolean))];
    
    console.log('Unique cities:', uniqueCities);

    if (uniqueCities.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tidak ada kota ditemukan dari partner aktif. Pastikan partner sudah diisi kota dan status aktif.',
        data: {
          totalPartners: partners.length,
          partnersWithCity: partners.filter(p => p.city.trim()).length,
        },
      });
    }

    // Get existing locations
    const existingLocations = await db.location.findMany({
      select: { slug: true, name: true },
    });
    const existingSlugs = new Set(existingLocations.map(l => l.slug));

    let created = 0;
    let skipped = 0;
    let noCoords = 0;
    const createdLocations: string[] = [];
    const skippedLocations: string[] = [];
    const errors: string[] = [];

    for (const city of uniqueCities) {
      const slug = generateSlug(city);
      
      // Skip if already exists
      if (existingSlugs.has(slug)) {
        skipped++;
        skippedLocations.push(city);
        console.log(`Skipping ${city} - already exists with slug ${slug}`);
        continue;
      }

      try {
        // Get full city data (coordinates, province, island) from library
        const cityData = getCityData(city);
        console.log(`City data for ${city}:`, cityData);
        
        // Generate SEO content with province if available
        const content = generateLocationContent(city, cityData?.province);
        console.log(`Generated content for ${city}`);

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
            latitude: cityData?.lat || null,
            longitude: cityData?.lng || null,
            isActive: true,
          },
        });
        
        created++;
        createdLocations.push(city);
        console.log(`Created location for ${city}`);
        
        if (!cityData?.lat || !cityData?.lng) {
          noCoords++;
        }
      } catch (createError) {
        console.error(`Failed to create location for ${city}:`, createError);
        errors.push(`${city}: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
      }
    }

    // Build response message
    let message = '';
    if (created > 0) {
      message = `✅ ${created} lokasi baru dibuat: ${createdLocations.join(', ')}.`;
    }
    if (skipped > 0) {
      message += ` ⏭️ ${skipped} lokasi sudah ada: ${skippedLocations.join(', ')}.`;
    }
    if (noCoords > 0) {
      message += ` 📍 ${noCoords} lokasi tanpa koordinat (perlu input manual).`;
    }
    if (errors.length > 0) {
      message += ` ⚠️ Error: ${errors.join(', ')}`;
    }
    if (created === 0 && skipped === 0) {
      message = 'Tidak ada perubahan.';
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        created,
        skipped,
        noCoords,
        totalPartners: partners.length,
        uniqueCities: uniqueCities.length,
        createdLocations,
        skippedLocations,
        errors,
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
