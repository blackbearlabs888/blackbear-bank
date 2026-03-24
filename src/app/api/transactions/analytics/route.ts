import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

export async function GET(request: NextRequest) {
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
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    // Last month date range
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const startOfLastMonth = new Date(lastMonthYear, lastMonth, 1);
    const endOfLastMonth = new Date(lastMonthYear, lastMonth + 1, 0);
    const daysInLastMonth = endOfLastMonth.getDate();

    // Last 30 days
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Last 7 days for chart
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Current month transactions for forecast
    const currentMonthTxs = await db.transaction.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: now },
        status: 'success',
      },
      select: { ownerProfit: true, createdAt: true, nominal: true },
    });

    // Last month transactions for comparison
    const lastMonthTxs = await db.transaction.findMany({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: 'success',
      },
      select: { ownerProfit: true, nominal: true },
    });

    // Calculate forecast - use toNumber for PostgreSQL Decimal compatibility
    const currentMonthProfit = currentMonthTxs.reduce((sum, tx) => sum + toNumber(tx.ownerProfit), 0);
    const currentMonthVolume = currentMonthTxs.reduce((sum, tx) => sum + toNumber(tx.nominal), 0);
    const avgDailyProfit = daysPassed > 0 ? currentMonthProfit / daysPassed : 0;
    const avgDailyVolume = daysPassed > 0 ? currentMonthVolume / daysPassed : 0;
    const projectedProfit = currentMonthProfit + (avgDailyProfit * daysRemaining);
    const projectedVolume = currentMonthVolume + (avgDailyVolume * daysRemaining);
    const lastMonthProfit = lastMonthTxs.reduce((sum, tx) => sum + toNumber(tx.ownerProfit), 0);
    const lastMonthVolume = lastMonthTxs.reduce((sum, tx) => sum + toNumber(tx.nominal), 0);
    const lastMonthAvgDaily = daysInLastMonth > 0 ? lastMonthProfit / daysInLastMonth : 0;
    const profitChange = lastMonthProfit > 0 
      ? ((currentMonthProfit - (lastMonthProfit * (daysPassed / daysInLastMonth))) / (lastMonthProfit * (daysPassed / daysInLastMonth))) * 100
      : 0;
    const volumeChange = lastMonthVolume > 0 
      ? ((currentMonthVolume - (lastMonthVolume * (daysPassed / daysInLastMonth))) / (lastMonthVolume * (daysPassed / daysInLastMonth))) * 100
      : 0;

    // Fee analysis - get successful transactions for this month
    const successfulTxs = await db.transaction.findMany({
      where: {
        status: 'success',
        createdAt: { gte: startOfMonth },
      },
      select: {
        nominal: true,
        paymentFee: true,
        platformFee: true,
        netMargin: true,
        ownerProfit: true,
      },
    });

    const totalTransactions = successfulTxs.length;
    const totalPaymentFee = successfulTxs.reduce((sum, tx) => sum + toNumber(tx.paymentFee), 0);
    const totalPlatformFee = successfulTxs.reduce((sum, tx) => sum + toNumber(tx.platformFee), 0);
    const totalNetMargin = successfulTxs.reduce((sum, tx) => sum + toNumber(tx.netMargin), 0);
    const totalVolume = successfulTxs.reduce((sum, tx) => sum + toNumber(tx.nominal), 0);
    const totalOwnerProfit = successfulTxs.reduce((sum, tx) => sum + toNumber(tx.ownerProfit), 0);

    // Fee percentage from volume
    const avgPaymentFeePercent = totalVolume > 0 ? (totalPaymentFee / totalVolume) * 100 : 0;
    const avgPlatformFeePercent = totalVolume > 0 ? (totalPlatformFee / totalVolume) * 100 : 0;
    const avgMarginPercent = totalVolume > 0 ? (totalNetMargin / totalVolume) * 100 : 0;

    // Daily trends for last 7 days
    const dailyTrendsRaw = await db.transaction.findMany({
      where: {
        createdAt: { gte: last7Days },
      },
      select: {
        createdAt: true,
        nominal: true,
        ownerProfit: true,
        status: true,
      },
    });

    // Group by day
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
      
      const dayTxs = dailyTrendsRaw.filter(tx => {
        const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
        return txDate === dateStr;
      });
      
      const profit = dayTxs.filter(tx => tx.status === 'success').reduce((sum, tx) => sum + toNumber(tx.ownerProfit), 0);
      const volume = dayTxs.reduce((sum, tx) => sum + toNumber(tx.nominal), 0);
      const count = dayTxs.length;
      
      dailyTrends.push({
        date: dateStr,
        day: dayName,
        profit,
        volume,
        count,
      });
    }

    // Payment type stats with detailed info
    const paymentTypes = await db.paymentType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        transactions: {
          where: { 
            createdAt: { gte: last30Days },
          },
          select: { 
            nominal: true, 
            status: true,
            ownerProfit: true,
            paymentFee: true,
          },
        },
      },
    });

    const paymentTypeStats = paymentTypes.map(pt => {
      const transactions = pt.transactions;
      const totalVolume = transactions.reduce((sum, tx) => sum + toNumber(tx.nominal), 0);
      const totalProfit = transactions.reduce((sum, tx) => sum + toNumber(tx.ownerProfit), 0);
      const totalFee = transactions.reduce((sum, tx) => sum + toNumber(tx.paymentFee), 0);
      const successCount = transactions.filter(tx => tx.status === 'success').length;

      return {
        id: pt.id,
        name: pt.name,
        transactionCount: transactions.length,
        totalVolume,
        totalProfit,
        totalFee,
        successCount,
        avgFeePercent: totalVolume > 0 ? (totalFee / totalVolume) * 100 : 0,
        successRate: transactions.length > 0 ? (successCount / transactions.length) * 100 : 0,
      };
    }).sort((a, b) => b.totalVolume - a.totalVolume);

    // Status counts for last 30 days
    const statusCountsRaw = await db.transaction.groupBy({
      by: ['status'],
      where: { createdAt: { gte: last30Days } },
      _count: { id: true },
      _sum: { nominal: true, ownerProfit: true },
    });

    const statusCounts = {
      pending: { count: 0, volume: 0, profit: 0 },
      verification: { count: 0, volume: 0, profit: 0 },
      process: { count: 0, volume: 0, profit: 0 },
      success: { count: 0, volume: 0, profit: 0 },
      failed: { count: 0, volume: 0, profit: 0 },
    };

    statusCountsRaw.forEach(item => {
      const key = item.status as keyof typeof statusCounts;
      if (statusCounts[key]) {
        statusCounts[key] = {
          count: item._count.id,
          volume: toNumber(item._sum.nominal),
          profit: toNumber(item._sum.ownerProfit),
        };
      }
    });

    // Partner performance
    const partnerPerformance = await db.partner.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        tier: true,
        commission: true,
        totalVolume: true,
        totalProfit: true,
        totalTransactions: true,
        transactions: {
          where: { createdAt: { gte: last30Days } },
          select: { nominal: true, ownerProfit: true, status: true },
        },
      },
    });

    const partnerStats = partnerPerformance.map(p => ({
      id: p.id,
      name: p.name,
      tier: p.tier,
      commission: toNumber(p.commission),
      totalVolume: toNumber(p.totalVolume),
      totalProfit: toNumber(p.totalProfit),
      totalTransactions: p.totalTransactions,
      last30DaysVolume: p.transactions.reduce((sum, tx) => sum + toNumber(tx.nominal), 0),
      last30DaysTransactions: p.transactions.length,
      last30DaysSuccessCount: p.transactions.filter(tx => tx.status === 'success').length,
    })).sort((a, b) => b.last30DaysVolume - a.last30DaysVolume);

    // Marketplace stats
    const marketplaceStats = await db.marketplace.findMany({
      where: { isActive: true },
      include: {
        transactions: {
          where: { createdAt: { gte: last30Days } },
          select: { nominal: true, platformFee: true, status: true },
        },
      },
    });

    const marketplaceAnalysis = marketplaceStats.map(mp => ({
      id: mp.id,
      name: mp.name,
      feePercent: toNumber(mp.feePercent),
      transactionCount: mp.transactions.length,
      totalVolume: mp.transactions.reduce((sum, tx) => sum + toNumber(tx.nominal), 0),
      totalFee: mp.transactions.reduce((sum, tx) => sum + toNumber(tx.platformFee), 0),
    }));

    // Hourly distribution (for peak hours analysis)
    const hourlyDistribution = await db.transaction.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: last30Days } },
      _count: { id: true },
    });

    // Count transactions by hour
    const hourCounts: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourCounts[h] = 0;
    
    hourlyDistribution.forEach(item => {
      const hour = new Date(item.createdAt).getHours();
      hourCounts[hour] += item._count.id;
    });
    
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Return complete data structure
    return NextResponse.json({
      success: true,
      data: {
        forecast: {
          currentMonthProfit,
          currentMonthVolume,
          avgDailyProfit,
          avgDailyVolume,
          projectedProfit,
          projectedVolume,
          daysRemaining,
          lastMonthProfit,
          lastMonthVolume,
          lastMonthAvgDaily,
          profitChange,
          volumeChange,
          daysPassed,
          daysInMonth,
        },
        feeAnalysis: {
          avgPaymentFee: totalTransactions > 0 ? totalPaymentFee / totalTransactions : 0,
          avgPlatformFee: totalTransactions > 0 ? totalPlatformFee / totalTransactions : 0,
          avgNetMargin: totalTransactions > 0 ? totalNetMargin / totalTransactions : 0,
          totalPaymentFee,
          totalPlatformFee,
          totalNetMargin,
          totalOwnerProfit,
          avgPaymentFeePercent,
          avgPlatformFeePercent,
          avgMarginPercent,
          totalTransactions,
          totalVolume,
        },
        dailyTrends,
        paymentTypes: paymentTypeStats,
        statusCounts: {
          pending: statusCounts.pending.count,
          verification: statusCounts.verification.count,
          process: statusCounts.process.count,
          success: statusCounts.success.count,
          failed: statusCounts.failed.count,
        },
        statusDetails: statusCounts,
        partnerStats,
        marketplaceAnalysis,
        peakHours,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
