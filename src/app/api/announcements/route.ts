import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET announcements
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly');

    const where: Record<string, unknown> = {};
    
    // Filter by type
    if (type && ['promo', 'broadcast', 'announcement'].includes(type)) {
      where.type = type;
    }

    // Filter by active status
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create announcement
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, type, link, startDate, expireDate, isActive } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Judul dan deskripsi wajib diisi' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['promo', 'broadcast', 'announcement'];
    const announcementType = type && validTypes.includes(type) ? type : 'announcement';

    // For promo type, link is required
    if (announcementType === 'promo' && !link) {
      return NextResponse.json(
        { success: false, error: 'Link wajib diisi untuk promo' },
        { status: 400 }
      );
    }

    // For broadcast type, dates are required
    if (announcementType === 'broadcast') {
      if (!startDate || !expireDate) {
        return NextResponse.json(
          { success: false, error: 'Tanggal mulai dan selesai wajib diisi untuk broadcast' },
          { status: 400 }
        );
      }
    }

    // Parse dates
    let parsedStartDate: Date | null = null;
    let parsedExpireDate: Date | null = null;

    if (startDate) {
      parsedStartDate = new Date(startDate);
    }

    if (expireDate) {
      parsedExpireDate = new Date(expireDate);
    }

    // Validate date order
    if (parsedStartDate && parsedExpireDate && parsedExpireDate <= parsedStartDate) {
      return NextResponse.json(
        { success: false, error: 'Tanggal selesai harus lebih dari tanggal mulai' },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        description,
        type: announcementType,
        link: link || null,
        startDate: parsedStartDate,
        expireDate: parsedExpireDate,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: announcement,
      message: 'Announcement berhasil dibuat',
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
