import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - List all locations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get('public') === 'true';

    // Use raw query to get all fields including latitude/longitude
    let locations;
    if (isPublic) {
      locations = await db.$queryRaw`
        SELECT 
          id, name, slug, description, content, featuredImage,
          metaTitle, metaDescription, keywords,
          latitude, longitude, isActive, createdAt, updatedAt
        FROM locations
        WHERE isActive = 1
        ORDER BY name ASC
      `;
    } else {
      locations = await db.$queryRaw`
        SELECT 
          id, name, slug, description, content, featuredImage,
          metaTitle, metaDescription, keywords,
          latitude, longitude, isActive, createdAt, updatedAt
        FROM locations
        ORDER BY name ASC
      `;
    }

    return NextResponse.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST - Create new location (owner only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      content,
      featuredImage,
      metaTitle,
      metaDescription,
      keywords,
      latitude,
      longitude,
      isActive,
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name dan slug wajib diisi' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingLocation = await db.location.findUnique({
      where: { slug },
    });

    if (existingLocation) {
      return NextResponse.json(
        { success: false, error: 'Slug sudah digunakan' },
        { status: 400 }
      );
    }

    const location = await db.location.create({
      data: {
        name,
        slug,
        description,
        content,
        featuredImage,
        metaTitle,
        metaDescription,
        keywords,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({
      success: true,
      data: location,
      message: 'Location berhasil dibuat',
    });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
