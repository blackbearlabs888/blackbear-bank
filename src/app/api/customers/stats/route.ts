import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Get all customers (owner sees all, partner sees their own)
    let where: Record<string, unknown> = {};
    
    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      where.partnerId = partner?.id;
    }

    // Get counts by label
    const [vipCount, regularCount, newCount, blacklistCount] = await Promise.all([
      db.customer.count({ where: { ...where, label: 'VIP' } }),
      db.customer.count({ where: { ...where, label: 'Regular' } }),
      db.customer.count({ where: { ...where, label: 'New' } }),
      db.customer.count({ where: { ...where, label: 'Blacklist' } }),
    ]);

    const totalCustomers = vipCount + regularCount + newCount + blacklistCount;

    // Get total volume (sum of all customer totalVolume)
    const volumeResult = await db.customer.aggregate({
      where,
      _sum: {
        totalVolume: true,
      },
    });

    // Get top cities
    const customersWithCity = await db.customer.findMany({
      where: {
        ...where,
        city: { not: null },
      },
      select: {
        city: true,
        totalVolume: true,
      },
    });

    // Aggregate by city
    const cityMap = new Map<string, { count: number; volume: number }>();
    for (const c of customersWithCity) {
      if (c.city) {
        const existing = cityMap.get(c.city) || { count: 0, volume: 0 };
        cityMap.set(c.city, {
          count: existing.count + 1,
          volume: existing.volume + (c.totalVolume || 0),
        });
      }
    }

    const topCities = Array.from(cityMap.entries())
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate average transaction value
    const totalTransactions = await db.customer.aggregate({
      where,
      _sum: {
        totalTransactions: true,
      },
    });

    const avgTransactionValue = (totalTransactions._sum.totalTransactions || 0) > 0
      ? (volumeResult._sum.totalVolume || 0) / totalTransactions._sum.totalTransactions
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers,
        totalVolume: volumeResult._sum.totalVolume || 0,
        vipCount,
        regularCount,
        newCount,
        blacklistCount,
        avgTransactionValue,
        topCities,
        growthRate: 0, // Placeholder for future implementation
      },
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
