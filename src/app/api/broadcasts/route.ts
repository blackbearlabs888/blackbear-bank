import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// GET broadcasts
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (activeOnly) {
      where.isActive = true;
      where.startDate = { lte: new Date() };
      where.expireDate = { gte: new Date() };
    }

    const broadcasts = await db.broadcast.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: broadcasts,
    });
  } catch (error) {
    console.error('Get broadcasts error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create broadcast
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
    const { title, description, type, startDate, expireDate, isActive } = body;

    if (!title || !description || !startDate || !expireDate) {
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

    const broadcast = await db.broadcast.create({
      data: {
        id: randomUUID(),
        title,
        description,
        type: type || 'broadcast',
        startDate: new Date(startDate),
        expireDate: new Date(expireDate),
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: broadcast,
      message: 'Broadcast berhasil dibuat',
    });
  } catch (error) {
    console.error('Create broadcast error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
