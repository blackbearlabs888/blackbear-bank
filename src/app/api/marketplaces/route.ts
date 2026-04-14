import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

// GET marketplaces
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly');

    const where: Record<string, unknown> = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const marketplaces = await db.marketplace.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Convert Decimal values to numbers for frontend compatibility
    const serializedMarketplaces = marketplaces.map(mp => ({
      ...mp,
      logoUrl: mp.logoUrl || null,
      feePercent: toNumber(mp.feePercent),
      feeFlat: toNumber(mp.feeFlat),
    }));

    return NextResponse.json({
      success: true,
      data: serializedMarketplaces,
    });
  } catch (error) {
    console.error('Get marketplaces error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create marketplace
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
    const { name, logoUrl, feePercent, feeFlat, description, isActive, shippingFee } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nama marketplace wajib diisi' },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existing = await db.marketplace.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Nama marketplace sudah ada' },
        { status: 400 }
      );
    }

    // Handle both feePercent and shippingFee field names for backwards compatibility
    const fee = feePercent ?? shippingFee ?? 0;

    const marketplace = await db.marketplace.create({
      data: {
        name,
        logoUrl: logoUrl || null,
        feePercent: parseFloat(fee) || 0,
        feeFlat: parseFloat(feeFlat) || 0,
        description: description || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: marketplace,
      message: 'Marketplace berhasil dibuat',
    });
  } catch (error) {
    console.error('Create marketplace error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
