import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
      data: location,
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

    const location = await db.location.update({
      where: { id: existingLocation.id },
      data: {
        city: body.city,
        slug: body.slug,
        description: body.description,
        featuredImage: body.featuredImage,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        address: body.address,
        phone: body.phone,
        whatsapp: body.whatsapp,
        isActive: body.isActive,
      },
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
