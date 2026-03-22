import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// Chart colors
const CHART_COLORS = [
  'hsl(280, 70%, 50%)', // Primary purple
  'hsl(200, 70%, 50%)', // Blue
  'hsl(150, 70%, 45%)', // Green
  'hsl(30, 70%, 50%)',  // Orange
  'hsl(0, 70%, 50%)',   // Red
];

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    if (user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(now.getDate() - 14);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Basic stats
    const [
      totalTransactions,
      totalVolume,
      totalProfit,
      activePartners,
      pendingTransactions,
      todayStats,
      thisWeekStats,
      lastWeekStats,
    ] = await Promise.all([
      db.transaction.count(),
      db.transaction.aggregate({
        _sum: { nominal: true },
      }),
      db.transaction.aggregate({
        _sum: { ownerProfit: true },
      }),
      db.partner.count({
        where: { status: 'active' },
      }),
      db.transaction.count({
        where: { status: 'pending' },
      }),
      db.transaction.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { nominal: true },
        _count: true,
      }),
      db.transaction.aggregate({
        where: { createdAt: { gte: startOfWeek } },
        _sum: { nominal: true },
      }),
      db.transaction.aggregate({
        where: {
          createdAt: {
            gte: startOfLastWeek,
            lt: startOfWeek,
          },
        },
        _sum: { nominal: true },
      }),
    ]);

    // Calculate week growth
    const thisWeekVolume = thisWeekStats._sum.nominal || 0;
    const lastWeekVolume = lastWeekStats._sum.nominal || 0;
    const weekGrowth = lastWeekVolume > 0 
      ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100 
      : 0;

    // Growth data for the last 6 months
    const growthData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthStats = await db.transaction.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          nominal: true,
          ownerProfit: true,
        },
        _count: true,
      });

      growthData.push({
        month: monthStart.toLocaleDateString('id-ID', { month: 'short' }),
        revenue: monthStats._sum.nominal || 0,
        transactions: monthStats._count,
        profit: monthStats._sum.ownerProfit || 0,
      });
    }

    // Daily data for the last 7 days
    const dailyData = [];
    const last7DaysData = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      
      const dayStats = await db.transaction.aggregate({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
          status: { not: 'failed' },
        },
        _sum: {
          nominal: true,
          ownerProfit: true,
        },
        _count: true,
      });

      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        volume: dayStats._sum.nominal || 0,
        profit: dayStats._sum.ownerProfit || 0,
        transactions: dayStats._count,
      });

      last7DaysData.push({
        date: dayStart.toISOString().split('T')[0],
        dayName: dayNames[dayStart.getDay()],
        volume: dayStats._sum.nominal || 0,
        count: dayStats._count,
      });
    }

    // Top partners with target progress
    const topPartners = await db.partner.findMany({
      where: { status: 'active' },
      orderBy: { totalVolume: 'desc' },
      take: 5,
    });

    // Calculate partner growth (compare this month to last month)
    const partnerHighlights = await Promise.all(
      topPartners.map(async (partner) => {
        const thisMonthStats = await db.transaction.aggregate({
          where: {
            partnerId: partner.id,
            createdAt: { gte: startOfMonth },
          },
          _sum: { nominal: true },
        });

        const lastMonthStats = await db.transaction.aggregate({
          where: {
            partnerId: partner.id,
            createdAt: {
              gte: startOfLastMonth,
              lt: startOfMonth,
            },
          },
          _sum: { nominal: true },
        });

        const thisMonthVolume = thisMonthStats._sum.nominal || 0;
        const lastMonthVolume = lastMonthStats._sum.nominal || 0;
        const growth = lastMonthVolume > 0 
          ? ((thisMonthVolume - lastMonthVolume) / lastMonthVolume) * 100 
          : 0;

        const targetProgress = partner.target > 0 
          ? (thisMonthVolume / partner.target) * 100 
          : 0;

        return {
          id: partner.id,
          name: partner.name,
          totalVolume: partner.totalVolume,
          totalProfit: partner.totalProfit,
          tier: partner.tier,
          badge: partner.badge,
          growth: Math.min(Math.max(growth, -100), 200), // Clamp between -100% and 200%
          targetProgress: Math.min(targetProgress, 100), // Cap at 100%
        };
      })
    );

    // Top customers
    const topCustomers = await db.customer.findMany({
      orderBy: { totalVolume: 'desc' },
      take: 5,
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const customerHighlights = topCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      totalVolume: customer.totalVolume,
      totalTransactions: customer.totalTransactions,
      label: customer.label,
      lastTransaction: customer.transactions[0]?.createdAt?.toISOString() || new Date().toISOString(),
    }));

    // Recent transactions with partner info
    const recentTransactions = await db.transaction.findMany({
      where: {
        createdAt: { gte: startOfWeek },
      },
      include: {
        customer: true,
        paymentType: true,
        partner: {
          select: {
            id: true,
            name: true,
            tier: true,
            badge: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Payment type distribution with count AND value
    const paymentTypeStats = await db.transaction.groupBy({
      by: ['paymentTypeId'],
      where: {
        status: 'success',
      },
      _sum: {
        nominal: true,
      },
      _count: true,
    });

    const paymentTypes = await db.paymentType.findMany();
    const paymentTypeDistribution = paymentTypeStats.map((stat, index) => {
      const pt = paymentTypes.find((p) => p.id === stat.paymentTypeId);
      return {
        name: pt?.name || 'Unknown',
        value: stat._sum.nominal || 0,
        count: stat._count,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    }).filter((item) => item.value > 0);

    // Marketplace distribution with count AND value
    const marketplaceStats = await db.transaction.groupBy({
      by: ['marketplaceId'],
      where: {
        status: 'success',
        marketplaceId: { not: null },
      },
      _sum: {
        nominal: true,
      },
      _count: true,
    });

    const marketplaces = await db.marketplace.findMany();
    const marketplaceDistribution = marketplaceStats.map((stat, index) => {
      const mp = marketplaces.find((m) => m.id === stat.marketplaceId);
      return {
        name: mp?.name || 'Unknown',
        value: stat._sum.nominal || 0,
        count: stat._count,
        color: CHART_COLORS[(index + 2) % CHART_COLORS.length],
      };
    }).filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Active announcements
    const announcements = await db.announcement.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        expireDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Active promos
    const promos = await db.promo.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        expireDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Forecast calculation (simple moving average based prediction)
    const avgMonthlyGrowth = growthData.length >= 2 
      ? (() => {
          const changes = [];
          for (let i = 1; i < growthData.length; i++) {
            const prev = growthData[i - 1].revenue;
            const curr = growthData[i].revenue;
            if (prev > 0) {
              changes.push((curr - prev) / prev);
            }
          }
          return changes.length > 0 
            ? changes.reduce((a, b) => a + b, 0) / changes.length 
            : 0;
        })()
      : 0;

    const lastMonthRevenue = growthData[growthData.length - 1]?.revenue || 0;
    const predictedNextMonth = lastMonthRevenue * (1 + avgMonthlyGrowth);
    
    // Simple confidence calculation based on data consistency
    const volumeVariation = (() => {
      const volumes = growthData.map(d => d.revenue);
      const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const variance = volumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumes.length;
      const stdDev = Math.sqrt(variance);
      return mean > 0 ? Math.max(0, 1 - (stdDev / mean)) : 0.5;
    })();

    // Predict transactions based on daily average
    const avgDailyTransactions = dailyData.reduce((a, b) => a + b.transactions, 0) / 7;
    const predictedTransactions = Math.round(avgDailyTransactions * 30);

    const forecast = {
      nextMonthRevenue: Math.round(predictedNextMonth),
      growthRate: avgMonthlyGrowth * 100,
      predictedTransactions,
      confidence: Math.min(0.95, Math.max(0.5, volumeVariation)),
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalTransactions,
          totalVolume: totalVolume._sum.nominal || 0,
          totalProfit: totalProfit._sum.ownerProfit || 0,
          activePartners,
          pendingTransactions,
          todayVolume: todayStats._sum.nominal || 0,
          todayTransactions: todayStats._count,
          weekGrowth,
        },
        growthData,
        dailyData,
        last7DaysData,
        partnerHighlights,
        customerHighlights,
        topPartners: partnerHighlights,
        recentTransactions,
        announcements,
        promos,
        forecast,
        paymentTypeDistribution,
        marketplaceDistribution,
      },
    });
  } catch (error) {
    console.error('Owner dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
