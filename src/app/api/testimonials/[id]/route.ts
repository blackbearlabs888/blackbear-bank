import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH /api/testimonials/[id] - Update testimonial (approve, feature, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Tidak memiliki akses' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isApproved, isFeatured } = body;

    const testimonial = await db.testimonial.findUnique({
      where: { id },
    });

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimoni tidak ditemukan' },
        { status: 404 }
      );
    }

    const updated = await db.testimonial.update({
      where: { id },
      data: {
        ...(isApproved !== undefined && { isApproved }),
        ...(isFeatured !== undefined && { isFeatured }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Update testimonial error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE /api/testimonials/[id] - Delete a testimonial
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Tidak memiliki akses' }, { status: 403 });
    }

    const { id } = await params;

    const testimonial = await db.testimonial.findUnique({
      where: { id },
    });

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimoni tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.testimonial.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Testimoni berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete testimonial error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
