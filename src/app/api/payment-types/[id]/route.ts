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
    const {
      name,
      logoUrl,
      onlineFeePercent,
      onlineFeeFlat,
      codFeePercent,
      codFeeFlat,
      threshold,
      discountPercent,
      discountNominal,
      isActive,
    } = body;

    // Check if payment type exists
    const existingPaymentType = await db.paymentType.findUnique({
      where: { id },
    });

    if (!existingPaymentType) {
      return NextResponse.json(
        { success: false, error: 'Tipe pembayaran tidak ditemukan' },
        { status: 404 }
      );
    }

    const paymentType = await db.paymentType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(onlineFeePercent !== undefined && { onlineFeePercent: parseFloat(onlineFeePercent) || 0 }),
        ...(onlineFeeFlat !== undefined && { onlineFeeFlat: parseFloat(onlineFeeFlat) || 0 }),
        ...(codFeePercent !== undefined && { codFeePercent: parseFloat(codFeePercent) || 0 }),
        ...(codFeeFlat !== undefined && { codFeeFlat: parseFloat(codFeeFlat) || 0 }),
        ...(threshold !== undefined && { threshold: parseFloat(threshold) || 0 }),
        ...(discountPercent !== undefined && { discountPercent: parseFloat(discountPercent) || 0 }),
        ...(discountNominal !== undefined && { discountNominal: parseFloat(discountNominal) || 0 }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: paymentType,
      message: 'Tipe pembayaran berhasil diperbarui',
    });
  } catch (error) {
    console.error('Update payment type error:', error);
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

    // Check if payment type exists
    const existingPaymentType = await db.paymentType.findUnique({
      where: { id },
    });

    if (!existingPaymentType) {
      return NextResponse.json(
        { success: false, error: 'Tipe pembayaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if payment type is being used
    const transactionsUsing = await db.transaction.count({
      where: { paymentTypeId: id },
    });

    if (transactionsUsing > 0) {
      return NextResponse.json(
        { success: false, error: 'Tipe pembayaran tidak dapat dihapus karena sudah digunakan dalam transaksi' },
        { status: 400 }
      );
    }

    await db.paymentType.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Tipe pembayaran berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete payment type error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
