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
    const { name, logoUrl, feePercent, feeFlat, description, isActive } = body;

    // Check if marketplace exists
    const existingMarketplace = await db.marketplace.findUnique({
      where: { id },
    });

    if (!existingMarketplace) {
      return NextResponse.json(
        { success: false, error: 'Marketplace tidak ditemukan' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (feePercent !== undefined) updateData.feePercent = parseFloat(feePercent) || 0;
    if (feeFlat !== undefined) updateData.feeFlat = parseFloat(feeFlat) || 0;
    if (description !== undefined) updateData.description = description;

    const marketplace = await db.marketplace.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: marketplace,
      message: 'Marketplace berhasil diperbarui',
    });
  } catch (error) {
    console.error('Update marketplace error:', error);
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

    // Check if marketplace exists
    const existingMarketplace = await db.marketplace.findUnique({
      where: { id },
    });

    if (!existingMarketplace) {
      return NextResponse.json(
        { success: false, error: 'Marketplace tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if marketplace is being used
    const transactionsUsing = await db.transaction.count({
      where: { marketplaceId: id },
    });

    if (transactionsUsing > 0) {
      return NextResponse.json(
        { success: false, error: 'Marketplace tidak dapat dihapus karena sudah digunakan dalam transaksi' },
        { status: 400 }
      );
    }

    await db.marketplace.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Marketplace berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete marketplace error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
