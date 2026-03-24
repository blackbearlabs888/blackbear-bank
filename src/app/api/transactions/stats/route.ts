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

    // Only owner can access stats
    if (user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;
    
    // One month ago for transaction list
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get current month transactions
    const currentMonthTransactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
        status: 'success',
      },
      include: {
        paymentType: true,
      },
    });

    // Get last month transactions for comparison
    const lastMonthTransactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
        status: 'success',
      },
    });

    // Get all success transactions for average calculations
    const allSuccessTransactions = await db.transaction.findMany({
      where: {
        status: 'success',
      },
      select: {
        paymentFee: true,
        platformFee: true,
        netMargin: true,
        ownerProfit: true,
        nominal: true,
        createdAt: true,
      },
    });

    // Get transactions from last 1 month for the tabbed list
    const recentTransactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: oneMonthAgo,
        },
      },
      include: {
        customer: true,
        paymentType: true,
        marketplace: true,
        partner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate current month stats - use toNumber for PostgreSQL Decimal compatibility
    const currentMonthProfit = currentMonthTransactions.reduce(
      (sum, tx) => sum + toNumber(tx.ownerProfit),
      0
    );
    const currentMonthVolume = currentMonthTransactions.reduce(
      (sum, tx) => sum + toNumber(tx.nominal),
      0
    );

    // Calculate last month stats
    const lastMonthProfit = lastMonthTransactions.reduce(
      (sum, tx) => sum + toNumber(tx.ownerProfit),
      0
    );
    const lastMonthVolume = lastMonthTransactions.reduce(
      (sum, tx) => sum + toNumber(tx.nominal),
      0
    );

    // Calculate forecast
    const avgDailyProfit = daysPassed > 0 ? currentMonthProfit / daysPassed : 0;
    const lastMonthAvgDaily = lastMonthTransactions.length > 0 
      ? lastMonthProfit / endOfLastMonth.getDate() 
      : 0;
    const projectedProfit = avgDailyProfit * daysInMonth;
    const profitChange = lastMonthProfit > 0 
      ? ((currentMonthProfit - lastMonthProfit) / lastMonthProfit) * 100 
      : 0;

    // Calculate fee analysis - use toNumber for PostgreSQL Decimal compatibility
    const totalPaymentFee = allSuccessTransactions.reduce((sum, tx) => sum + toNumber(tx.paymentFee), 0);
    const totalPlatformFee = allSuccessTransactions.reduce((sum, tx) => sum + toNumber(tx.platformFee), 0);
    const totalNetMargin = allSuccessTransactions.reduce((sum, tx) => sum + toNumber(tx.netMargin), 0);
    const totalVolume = allSuccessTransactions.reduce((sum, tx) => sum + toNumber(tx.nominal), 0);
    
    const avgPaymentFee = allSuccessTransactions.length > 0
      ? totalPaymentFee / allSuccessTransactions.length
      : 0;
    const avgPlatformFee = allSuccessTransactions.length > 0
      ? totalPlatformFee / allSuccessTransactions.length
      : 0;
    const avgNetMargin = avgPaymentFee - avgPlatformFee;
    const avgMarginPercent = totalPaymentFee > 0 
      ? (totalNetMargin / totalPaymentFee) * 100 
      : 0;

    // Get payment type breakdown for current month
    const paymentTypes = await db.paymentType.findMany({
      where: { isActive: true },
      include: {
        transactions: {
          where: {
            createdAt: { gte: oneMonthAgo },
          },
        },
      },
    });

    const paymentTypeStats = paymentTypes.map((pt) => {
      const successTx = pt.transactions.filter(tx => tx.status === 'success');
      return {
        id: pt.id,
        name: pt.name,
        transactionCount: pt.transactions.length,
        totalVolume: successTx.reduce((sum, tx) => sum + toNumber(tx.nominal), 0),
        successCount: successTx.length,
      };
    }).filter((pt) => pt.transactionCount > 0);

    // Group transactions by status for tabs
    const transactionsByStatus = {
      pending: recentTransactions.filter((tx) => tx.status === 'pending'),
      verification: recentTransactions.filter((tx) => tx.status === 'verification'),
      process: recentTransactions.filter((tx) => tx.status === 'process'),
      success: recentTransactions.filter((tx) => tx.status === 'success'),
      failed: recentTransactions.filter((tx) => tx.status === 'failed'),
    };

    // Status counts
    const statusCounts = {
      pending: transactionsByStatus.pending.length,
      verification: transactionsByStatus.verification.length,
      process: transactionsByStatus.process.length,
      success: transactionsByStatus.success.length,
      failed: transactionsByStatus.failed.length,
    };

    // Return data in the structure expected by frontend
    return NextResponse.json({
      success: true,
      data: {
        forecast: {
          currentMonthProfit,
          avgDailyProfit,
          projectedProfit,
          daysRemaining,
          lastMonthProfit,
          lastMonthAvgDaily,
          profitChange,
          daysPassed,
          daysInMonth,
        },
        feeAnalysis: {
          avgPaymentFee,
          avgPlatformFee,
          avgNetMargin,
          totalPaymentFee,
          totalPlatformFee,
          totalNetMargin,
          avgMarginPercent,
          totalTransactions: allSuccessTransactions.length,
          totalVolume,
        },
        paymentTypes: paymentTypeStats,
        statusCounts,
        transactionsByStatus,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
