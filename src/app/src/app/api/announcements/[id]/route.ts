import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, type, link, isActive, startDate, expireDate } = body;

    // Get existing announcement first
    const existingAnnouncement = await db.announcement.findUnique({
      where: { id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, error: 'Pengumuman tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate type if provided
    const validTypes = ['promo', 'broadcast', 'announcement'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Tipe tidak valid' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle link (can be null to clear it)
    if (link !== undefined) {
      updateData.link = link || null;
    }

    // Handle dates (can be null to clear them)
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }

    if (expireDate !== undefined) {
      updateData.expireDate = expireDate ? new Date(expireDate) : null;
    }

    // Validate date order - use existing dates if not being updated
    const finalStartDate = updateData.startDate !== undefined 
      ? updateData.startDate 
      : existingAnnouncement.startDate;
    
    const finalExpireDate = updateData.expireDate !== undefined 
      ? updateData.expireDate 
      : existingAnnouncement.expireDate;

    if (finalStartDate && finalExpireDate && new Date(finalExpireDate) <= new Date(finalStartDate)) {
      return NextResponse.json(
        { success: false, error: 'Tanggal selesai harus lebih dari tanggal mulai' },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: announcement,
      message: 'Pengumuman berhasil diperbarui',
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if announcement exists
    const existingAnnouncement = await db.announcement.findUnique({
      where: { id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, error: 'Pengumuman tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.announcement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengumuman berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// GET single announcement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const announcement = await db.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Pengumuman tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
