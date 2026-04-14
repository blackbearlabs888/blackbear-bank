import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

// GET payment types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly');

    const where: Record<string, unknown> = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const paymentTypes = await db.paymentType.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Convert Decimal values to numbers for frontend compatibility
    const serializedPaymentTypes = paymentTypes.map(pt => ({
      ...pt,
      logoUrl: pt.logoUrl || null,
      onlineFeePercent: toNumber(pt.onlineFeePercent),
      onlineFeeFlat: toNumber(pt.onlineFeeFlat),
      codFeePercent: toNumber(pt.codFeePercent),
      codFeeFlat: toNumber(pt.codFeeFlat),
      threshold: toNumber(pt.threshold),
      discountPercent: toNumber(pt.discountPercent),
      discountNominal: toNumber(pt.discountNominal),
    }));

    return NextResponse.json({
      success: true,
      data: serializedPaymentTypes,
    });
  } catch (error) {
    console.error('Get payment types error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create payment type
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

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nama tipe pembayaran wajib diisi' },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existing = await db.paymentType.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Nama tipe pembayaran sudah ada' },
        { status: 400 }
      );
    }

    const paymentType = await db.paymentType.create({
      data: {
        name,
        logoUrl: logoUrl || null,
        onlineFeePercent: parseFloat(onlineFeePercent) || 0,
        onlineFeeFlat: parseFloat(onlineFeeFlat) || 0,
        codFeePercent: parseFloat(codFeePercent) || 0,
        codFeeFlat: parseFloat(codFeeFlat) || 0,
        threshold: parseFloat(threshold) || 1000000,
        discountPercent: parseFloat(discountPercent) || 0,
        discountNominal: parseFloat(discountNominal) || 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: paymentType,
      message: 'Tipe pembayaran berhasil dibuat',
    });
  } catch (error) {
    console.error('Create payment type error:', error);
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
