import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Get all partners
    const partners = await db.partner.findMany({
      select: {
        id: true,
        name: true,
        tier: true,
        status: true,
        totalProfit: true,
        totalVolume: true,
        totalTransactions: true,
        target: true,
        city: true,
        joinedAt: true,
      },
    });

    // Convert Decimal fields to numbers
    const partnersData = partners.map(p => ({
      ...p,
      totalProfit: toNumber(p.totalProfit),
      totalVolume: toNumber(p.totalVolume),
      target: toNumber(p.target),
    }));

    const totalPartners = partnersData.length;
    const activePartners = partnersData.filter(p => p.status === 'active').length;
    const suspendedPartners = partnersData.filter(p => p.status === 'suspended').length;

    const totalVolume = partnersData.reduce((sum, p) => sum + (p.totalVolume || 0), 0);
    const totalProfit = partnersData.reduce((sum, p) => sum + (p.totalProfit || 0), 0);
    const totalTransactions = partnersData.reduce((sum, p) => sum + (p.totalTransactions || 0), 0);

    const avgProfitPerPartner = totalPartners > 0 ? totalProfit / totalPartners : 0;
    const avgVolumePerPartner = totalPartners > 0 ? totalVolume / totalPartners : 0;

    // Tier distribution
    const tierMap = new Map<string, { count: number; volume: number; profit: number }>();
    for (const p of partnersData) {
      const tier = p.tier || 'Bronze';
      const existing = tierMap.get(tier) || { count: 0, volume: 0, profit: 0 };
      tierMap.set(tier, {
        count: existing.count + 1,
        volume: existing.volume + (p.totalVolume || 0),
        profit: existing.profit + (p.totalProfit || 0),
      });
    }

    const tierDistribution = Array.from(tierMap.entries()).map(([tier, data]) => ({
      tier,
      ...data,
    }));

    // Top partners by profit
    const topPartnersByProfit = [...partnersData]
      .sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        profit: p.totalProfit || 0,
        volume: p.totalVolume || 0,
        tier: p.tier || 'Bronze',
        transactions: p.totalTransactions || 0,
      }));

    // Top partners by volume
    const topPartnersByVolume = [...partnersData]
      .sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        profit: p.totalProfit || 0,
        volume: p.totalVolume || 0,
        tier: p.tier || 'Bronze',
        transactions: p.totalTransactions || 0,
      }));

    // Top cities
    const cityMap = new Map<string, { count: number; volume: number }>();
    for (const p of partnersData) {
      if (p.city) {
        const existing = cityMap.get(p.city) || { count: 0, volume: 0 };
        cityMap.set(p.city, {
          count: existing.count + 1,
          volume: existing.volume + (p.totalVolume || 0),
        });
      }
    }

    const topCities = Array.from(cityMap.entries())
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // New partners this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = partnersData.filter(p => new Date(p.joinedAt) >= startOfMonth).length;

    // Calculate growth rate (partners who joined this month vs last month)
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const lastMonthPartners = partnersData.filter(p => {
      const joinedAt = new Date(p.joinedAt);
      return joinedAt >= startOfLastMonth && joinedAt < startOfMonth;
    }).length;

    const growthRate = lastMonthPartners > 0
      ? ((newThisMonth - lastMonthPartners) / lastMonthPartners) * 100
      : newThisMonth > 0 ? 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalPartners,
        activePartners,
        suspendedPartners,
        totalVolume,
        totalProfit,
        totalTransactions,
        avgProfitPerPartner,
        avgVolumePerPartner,
        tierDistribution,
        topPartnersByProfit,
        topPartnersByVolume,
        topCities,
        newThisMonth,
        growthRate,
      },
    });
  } catch (error) {
    console.error('Get partner stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
