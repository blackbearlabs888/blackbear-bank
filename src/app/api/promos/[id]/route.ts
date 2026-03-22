import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

type Params = Promise<{ id: string }>;

// PATCH update promo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, link, startDate, expireDate, isActive } = body;

    const existing = await db.promo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Promo tidak ditemukan' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (link !== undefined) updateData.link = link;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (expireDate !== undefined) updateData.expireDate = new Date(expireDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    // Validate dates
    const finalStartDate = updateData.startDate || existing.startDate;
    const finalExpireDate = updateData.expireDate || existing.expireDate;
    if (finalExpireDate <= finalStartDate) {
      return NextResponse.json(
        { success: false, error: 'Tanggal expire harus lebih dari tanggal mulai' },
        { status: 400 }
      );
    }

    const promo = await db.promo.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: promo,
      message: 'Promo berhasil diupdate',
    });
  } catch (error) {
    console.error('Update promo error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE promo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const existing = await db.promo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Promo tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.promo.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Promo berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete promo error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
