import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET promos
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const promos = await db.promo.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: promos,
    });
  } catch (error) {
    console.error('Get promos error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create promo
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
    const { title, link, startDate, expireDate, isActive } = body;

    if (!title || !link || !startDate || !expireDate) {
      return NextResponse.json(
        { success: false, error: 'Semua field wajib harus diisi' },
        { status: 400 }
      );
    }

    if (new Date(expireDate) <= new Date(startDate)) {
      return NextResponse.json(
        { success: false, error: 'Tanggal expire harus lebih dari tanggal mulai' },
        { status: 400 }
      );
    }

    const promo = await db.promo.create({
      data: {
        title,
        link,
        startDate: new Date(startDate),
        expireDate: new Date(expireDate),
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: promo,
      message: 'Promo berhasil dibuat',
    });
  } catch (error) {
    console.error('Create promo error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
