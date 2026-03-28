import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET all customers with partner info (owner only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const label = searchParams.get('label');
    const city = searchParams.get('city');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
      ];
    }

    if (label) {
      where.label = label;
    }

    if (city) {
      where.city = { contains: city };
    }

    // Get customers with partner info
    const customers = await db.customer.findMany({
      where,
      orderBy: { totalVolume: 'desc' },
      take: limit,
      skip: offset,
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    const total = await db.customer.count({ where });

    // Get top customers by volume
    const topCustomers = await db.customer.findMany({
      where: { label: { not: 'Blacklist' } },
      orderBy: { totalVolume: 'desc' },
      take: 5,
      include: {
        partner: {
          select: { name: true },
        },
      },
    });

    // Get customer locations (city distribution)
    const locationStats = await db.customer.groupBy({
      by: ['city'],
      where: { city: { not: null } },
      _count: { id: true },
      _sum: { totalVolume: true },
    });

    // Get label distribution
    const labelStats = await db.customer.groupBy({
      by: ['label'],
      _count: { id: true },
      _sum: { totalVolume: true },
    });

    // Get total stats
    const totalStats = await db.customer.aggregate({
      _count: { id: true },
      _sum: { totalVolume: true, totalTransactions: true },
    });

    return NextResponse.json({
      success: true,
      data: customers.map(c => ({
        ...c,
        transactionCount: c._count.transactions,
      })),
      topCustomers,
      locationStats: locationStats.filter(l => l.city).map(l => ({
        city: l.city,
        count: l._count.id,
        volume: l._sum.totalVolume || 0,
      })),
      labelStats: labelStats.map(l => ({
        label: l.label,
        count: l._count.id,
        volume: l._sum.totalVolume || 0,
      })),
      total: total,
      stats: {
        totalCustomers: totalStats._count.id,
        totalVolume: totalStats._sum.totalVolume || 0,
        totalTransactions: totalStats._sum.totalTransactions || 0,
      },
    });
  } catch (error) {
    console.error('Get owner customers error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
