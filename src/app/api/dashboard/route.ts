import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

// Helper function to get last 7 days data
async function getLast7DaysData() {
  const data = [];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Get current date in local timezone
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get all transactions for volume (excluding only failed)
    const transactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: date,
          lt: nextDate,
        },
        status: {
          not: 'failed',
        },
      },
      select: {
        nominal: true,
      },
    });

    const volume = transactions.reduce((sum, tx) => sum + toNumber(tx.nominal), 0);

    data.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[date.getDay()],
      volume,
      count: transactions.length,
    });
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Get pagination params for transactions
    const { searchParams } = new URL(request.url);
    const transactionsPage = parseInt(searchParams.get('transactionsPage') || '1');
    const transactionsLimit = 10;
    const transactionsOffset = (transactionsPage - 1) * transactionsLimit;

    if (user.role === 'owner') {
      // Date calculations
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const lastWeekStart = new Date(startOfWeek);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(startOfWeek);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Basic stats
      const [totalTransactions, totalVolume, totalProfit, activePartners, totalCustomers] = await Promise.all([
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
        db.customer.count(),
      ]);

      // Period-based transaction stats
      const [todayStats, yesterdayStats, weekStats, lastWeekStats, monthStats, lastMonthStats] = await Promise.all([
        // Today
        db.transaction.aggregate({
          where: { createdAt: { gte: today } },
          _count: true,
          _sum: { nominal: true, ownerProfit: true },
        }),
        // Yesterday
        db.transaction.aggregate({
          where: { 
            createdAt: { 
              gte: yesterday, 
              lt: today 
            } 
          },
          _count: true,
          _sum: { nominal: true, ownerProfit: true },
        }),
        // This week
        db.transaction.aggregate({
          where: { createdAt: { gte: startOfWeek } },
          _count: true,
          _sum: { nominal: true, ownerProfit: true },
        }),
        // Last week
        db.transaction.aggregate({
          where: { 
            createdAt: { 
              gte: lastWeekStart, 
              lt: lastWeekEnd 
            } 
          },
          _count: true,
          _sum: { nominal: true, ownerProfit: true },
        }),
        // This month
        db.transaction.aggregate({
          where: { createdAt: { gte: startOfMonth } },
          _count: true,
          _sum: { nominal: true, ownerProfit: true },
        }),
        // Last month
        db.transaction.aggregate({
          where: { 
            createdAt: { 
              gte: lastMonthStart, 
              lte: lastMonthEnd 
            } 
          },
          _count: true,
          _sum: { nominal: true, ownerProfit: true },
        }),
      ]);

      // Pending and verification counts
      const [pendingCount, verificationCount, processCount, successCount, failedCount] = await Promise.all([
        db.transaction.count({ where: { status: 'pending' } }),
        db.transaction.count({ where: { status: 'verification' } }),
        db.transaction.count({ where: { status: 'process' } }),
        db.transaction.count({ where: { status: 'success' } }),
        db.transaction.count({ where: { status: 'failed' } }),
      ]);

      // Calculate conversion rate (success / total)
      const conversionRate = totalTransactions > 0 
        ? (successCount / totalTransactions) * 100 
        : 0;

      // Calculate average transaction value this month
      const avgTransactionValue = monthStats._count > 0
        ? toNumber(monthStats._sum.nominal) / monthStats._count
        : 0;

      // Growth calculations - use toNumber for PostgreSQL Decimal compatibility
      const thisMonthProfitNum = toNumber(monthStats._sum.ownerProfit);
      const lastMonthProfitNum = toNumber(lastMonthStats._sum.ownerProfit);
      const thisMonthVolumeNum = toNumber(monthStats._sum.nominal);
      const lastMonthVolumeNum = toNumber(lastMonthStats._sum.nominal);

      const profitGrowth = lastMonthProfitNum > 0
        ? ((thisMonthProfitNum - lastMonthProfitNum) / lastMonthProfitNum) * 100
        : 0;

      const volumeGrowth = lastMonthVolumeNum > 0
        ? ((thisMonthVolumeNum - lastMonthVolumeNum) / lastMonthVolumeNum) * 100
        : 0;

      // Partner acquisition this month vs last month
      const [newPartnersThisMonth, newPartnersLastMonth] = await Promise.all([
        db.partner.count({
          where: { joinedAt: { gte: startOfMonth } },
        }),
        db.partner.count({
          where: { 
            joinedAt: { 
              gte: lastMonthStart, 
              lte: lastMonthEnd 
            } 
          },
        }),
      ]);
      
      const partnerAcquisitionRate = newPartnersLastMonth > 0 
        ? ((newPartnersThisMonth - newPartnersLastMonth) / newPartnersLastMonth) * 100 
        : newPartnersThisMonth > 0 ? 100 : 0;

      // Customer growth this month vs last month
      const [newCustomersThisMonth, newCustomersLastMonth] = await Promise.all([
        db.customer.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        db.customer.count({
          where: { 
            createdAt: { 
              gte: lastMonthStart, 
              lte: lastMonthEnd 
            } 
          },
        }),
      ]);
      
      const customerGrowthRate = newCustomersLastMonth > 0 
        ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth) * 100 
        : newCustomersThisMonth > 0 ? 100 : 0;

      // Recent transactions with pagination
      const [recentTransactions, totalTransactionsCount] = await Promise.all([
        db.transaction.findMany({
          include: {
            customer: true,
            paymentType: true,
            partner: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: transactionsOffset,
          take: transactionsLimit,
        }),
        db.transaction.count(),
      ]);
      
      const totalTransactionsPages = Math.ceil(totalTransactionsCount / transactionsLimit);
      
      // For activity timeline
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Top 3 performing partners by profit this month
      const topPartners = await db.partner.findMany({
        where: { status: 'active' },
        orderBy: { totalProfit: 'desc' },
        take: 3,
      });

      // Top 5 customers by volume (largest first)
      const topCustomers = await db.customer.findMany({
        orderBy: { totalVolume: 'desc' },
        take: 5,
      });

      // Recent large transactions (nominal >= 5 million)
      const largeTransactions = await db.transaction.findMany({
        where: {
          nominal: { gte: 5000000 },
          status: { in: ['success', 'process', 'verification'] },
        },
        include: {
          customer: true,
          partner: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Activity timeline - recent activities
      const recentPartnerActivities = await db.partner.findMany({
        where: {
          joinedAt: { gte: sevenDaysAgo },
        },
        orderBy: { joinedAt: 'desc' },
        take: 5,
      });

      const recentCustomerActivities = await db.customer.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Build activity timeline
      const activities: Array<{
        id: string;
        type: 'transaction' | 'partner' | 'customer';
        action: string;
        name: string;
        timestamp: Date;
        detail?: string;
      }> = [];

      // Add recent transactions to timeline
      recentTransactions.slice(0, 5).forEach((tx) => {
        activities.push({
          id: `tx-${tx.id}`,
          type: 'transaction',
          action: 'Transaksi baru',
          name: tx.customer.name,
          timestamp: tx.createdAt,
          detail: `Rp ${toNumber(tx.nominal).toLocaleString('id-ID')}`,
        });
      });

      // Add new partners to timeline
      recentPartnerActivities.forEach((partner) => {
        activities.push({
          id: `partner-${partner.id}`,
          type: 'partner',
          action: 'Partner baru',
          name: partner.name,
          timestamp: partner.joinedAt,
          detail: partner.tier,
        });
      });

      // Add new customers to timeline
      recentCustomerActivities.forEach((customer) => {
        activities.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          action: 'Customer baru',
          name: customer.name,
          timestamp: customer.createdAt,
          detail: customer.label,
        });
      });

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Active announcements - include those without date restrictions or within date range
      const announcements = await db.announcement.findMany({
        where: {
          isActive: true,
          OR: [
            // No date restrictions
            { startDate: null, expireDate: null },
            // Only start date, not expired yet
            { startDate: { lte: now }, expireDate: null },
            // Only expire date, started already
            { startDate: null, expireDate: { gte: now } },
            // Both dates, within range
            { startDate: { lte: now }, expireDate: { gte: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      // Active promos - from both announcement table (type promo) and legacy promos table
      const promoAnnouncements = await db.announcement.findMany({
        where: {
          type: 'promo',
          isActive: true,
          OR: [
            { startDate: null, expireDate: null },
            { startDate: { lte: now }, expireDate: null },
            { startDate: null, expireDate: { gte: now } },
            { startDate: { lte: now }, expireDate: { gte: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const legacyPromos = await db.promo.findMany({
        where: {
          isActive: true,
          OR: [
            { startDate: null, expireDate: null },
            { startDate: { lte: now }, expireDate: null },
            { startDate: null, expireDate: { gte: now } },
            { startDate: { lte: now }, expireDate: { gte: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const promos = [...promoAnnouncements, ...legacyPromos];

      // Partner notifications from Notification table (new partner_message type)
      const partnerMessageNotifications = await db.notification.findMany({
        where: {
          type: 'partner_message',
          targetType: 'owner',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Legacy partner notifications - recent notes from partner transactions
      const partnerNotifications = await db.transaction.findMany({
        where: {
          notes: { not: null },
          partnerId: { not: null },
        },
        include: {
          partner: true,
          customer: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      // Filter transactions that have actual notification messages (containing timestamp pattern)
      const filteredNotifications = partnerNotifications.filter(tx =>
        tx.notes && tx.notes.includes('[') && tx.notes.includes(']')
      );

      // Count unread partner messages
      const unreadPartnerMessages = await db.notification.count({
        where: {
          type: 'partner_message',
          targetType: 'owner',
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalTransactions,
            totalVolume: toNumber(totalVolume._sum.nominal),
            totalProfit: toNumber(totalProfit._sum.ownerProfit),
            activePartners,
            totalCustomers,
            thisMonthProfit: thisMonthProfitNum,
            lastMonthProfit: lastMonthProfitNum,
            profitChange: profitGrowth,
            thisMonthVolume: thisMonthVolumeNum,
            lastMonthVolume: lastMonthVolumeNum,
            volumeChange: volumeGrowth,
            newCustomersThisMonth,
            newPartnersThisMonth,
            pendingCount,
            verificationCount,
            processCount,
            successCount,
            failedCount,
            conversionRate,
            avgTransactionValue,
          },
          topPartnersThisMonth: topPartners.map(p => ({
            id: p.id,
            name: p.name,
            tier: p.tier,
            profit: toNumber(p.totalProfit),
          })),
          partnersCloseToTarget: await db.partner.findMany({
            where: {
              status: 'active',
              target: { gt: 0 },
            },
            orderBy: { totalProfit: 'desc' },
            take: 5,
          }).then(partners => partners
            .map(p => ({
              id: p.id,
              name: p.name,
              achievement: toNumber(p.target) > 0 ? (toNumber(p.totalProfit) / toNumber(p.target)) * 100 : 0,
              profit: toNumber(p.totalProfit),
              target: toNumber(p.target),
            }))
            .filter(p => p.achievement >= 90)
          ),
          newPartners: await db.partner.findMany({
            where: { joinedAt: { gte: startOfMonth } },
            orderBy: { joinedAt: 'desc' },
            take: 5,
            select: { id: true, name: true, tier: true, joinedAt: true },
          }),
          topCustomersThisMonth: topCustomers.map(c => ({
            id: c.id,
            name: c.name,
            label: c.label || 'New',
            volume: toNumber(c.totalVolume),
            transactions: c.totalTransactions,
          })),
          last7DaysData: await getLast7DaysData(),
          recentTransactions,
          transactionsPagination: {
            currentPage: transactionsPage,
            totalPages: totalTransactionsPages,
            totalCount: totalTransactionsCount,
            limit: transactionsLimit,
          },
          activities: activities.slice(0, 10),
          announcements,
          promos,
          partnerNotifications: filteredNotifications.map(tx => ({
            id: tx.id,
            orderId: tx.orderId,
            partnerName: tx.partner?.name,
            customerName: tx.customer.name,
            notes: tx.notes,
            nominal: toNumber(tx.nominal),
            status: tx.status,
            updatedAt: tx.updatedAt,
          })),
          partnerMessages: partnerMessageNotifications.map(n => ({
            id: n.id,
            transactionId: n.transactionId,
            title: n.title,
            message: n.message,
            data: n.data ? JSON.parse(n.data) : null,
            isRead: n.isRead,
            createdAt: n.createdAt,
          })),
          unreadPartnerMessages,
        },
      });
    } else {
      // Partner dashboard stats
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });

      if (!partner) {
        return NextResponse.json(
          { success: false, error: 'Partner tidak ditemukan' },
          { status: 404 }
        );
      }

      // Partner stats - use partner table for profit/volume (only successful transactions)
      // Count transactions separately
      const [totalTransactions, pendingTransactions] = await Promise.all([
        db.transaction.count({
          where: { partnerId: partner.id },
        }),
        db.transaction.count({
          where: { partnerId: partner.id, status: 'pending' },
        }),
      ]);

      // Top 5 leaderboard - ordered by totalProfit (successful transactions only)
      const leaderboard = await db.partner.findMany({
        where: { status: 'active' },
        orderBy: { totalProfit: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          totalProfit: true,
          tier: true,
          badge: true,
        },
      });

      // Active announcements - include those without date restrictions or within date range
      const now = new Date();
      const announcements = await db.announcement.findMany({
        where: {
          isActive: true,
          OR: [
            { startDate: null, expireDate: null },
            { startDate: { lte: now }, expireDate: null },
            { startDate: null, expireDate: { gte: now } },
            { startDate: { lte: now }, expireDate: { gte: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      // Active promos - fetch from announcements table with type 'promo'
      const promoAnnouncements = await db.announcement.findMany({
        where: {
          type: 'promo',
          isActive: true,
          OR: [
            { startDate: null, expireDate: null },
            { startDate: { lte: now }, expireDate: null },
            { startDate: null, expireDate: { gte: now } },
            { startDate: { lte: now }, expireDate: { gte: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      // Also get legacy promos
      const legacyPromos = await db.promo.findMany({
        where: {
          isActive: true,
          OR: [
            { startDate: null, expireDate: null },
            { startDate: { lte: now }, expireDate: null },
            { startDate: null, expireDate: { gte: now } },
            { startDate: { lte: now }, expireDate: { gte: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      // Combine promos
      const promos = [...promoAnnouncements, ...legacyPromos];

      // New customers added by this partner this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newCustomersThisMonth = await db.customer.count({
        where: {
          partnerId: partner.id,
          addedBy: 'partner',
          createdAt: { gte: startOfMonth },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          partner: {
            ...partner,
            commission: toNumber(partner.commission),
            target: toNumber(partner.target),
            totalProfit: toNumber(partner.totalProfit),
            totalVolume: toNumber(partner.totalVolume),
          },
          stats: {
            totalTransactions,
            totalVolume: toNumber(partner.totalVolume),
            totalProfit: toNumber(partner.totalProfit),
            pendingTransactions,
            newCustomersThisMonth,
          },
          leaderboard: leaderboard.map(lb => ({
            ...lb,
            totalProfit: toNumber(lb.totalProfit),
          })),
          announcements,
          promos,
        },
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
