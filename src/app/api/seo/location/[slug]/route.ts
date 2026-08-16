import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitize-html';

// GET - Get location by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const location = await db.location.findUnique({
      where: { slug },
    });

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...location,
        // Defense-in-depth: re-sanitize on read so legacy rows written before
        // write-time sanitization are also safe. No-op for already-clean rows.
        content: sanitizeHtml(location.content || ''),
      },
    });
  } catch (error) {
    console.error('Get location error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PUT - Update location (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const body = await request.json();

    const existingLocation = await db.location.findUnique({
      where: { slug },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { success: false, error: 'Location tidak ditemukan' },
        { status: 404 }
      );
    }

    // If changing slug, check if new slug exists
    if (body.slug && body.slug !== slug) {
      const slugExists = await db.location.findUnique({
        where: { slug: body.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Field allowlist — only known Location fields are accepted
    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string') updateData.name = body.name;
    if (typeof body.slug === 'string') updateData.slug = body.slug;
    if (typeof body.description === 'string') updateData.description = body.description;
    // Sanitize HTML content at write-time to prevent stored XSS.
    if (typeof body.content === 'string') updateData.content = sanitizeHtml(body.content);
    if (typeof body.featuredImage === 'string' || body.featuredImage === null) updateData.featuredImage = body.featuredImage;
    if (typeof body.metaTitle === 'string' || body.metaTitle === null) updateData.metaTitle = body.metaTitle;
    if (typeof body.metaDescription === 'string' || body.metaDescription === null) updateData.metaDescription = body.metaDescription;
    if (typeof body.keywords === 'string' || body.keywords === null) updateData.keywords = body.keywords;
    if (typeof body.latitude === 'number') updateData.latitude = body.latitude;
    if (typeof body.longitude === 'number') updateData.longitude = body.longitude;
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive;

    const location = await db.location.update({
      where: { id: existingLocation.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: location,
      message: 'Location berhasil diupdate',
    });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE - Delete location (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug } = await params;

    const location = await db.location.findUnique({
      where: { slug },
    });

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.location.delete({
      where: { id: location.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Location berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete location error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
