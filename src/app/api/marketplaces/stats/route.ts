import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

// GET marketplace usage stats
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    // Get all marketplaces with their transaction stats
    const marketplaces = await db.marketplace.findMany({
      include: {
        _count: {
          select: { transactions: true },
        },
        transactions: {
          where: {
            status: 'success',
          },
          select: {
            nominal: true,
            platformFee: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const stats = marketplaces.map((mp) => {
      const totalVolume = mp.transactions.reduce((sum, t) => sum + toNumber(t.nominal), 0);
      const totalFees = mp.transactions.reduce((sum, t) => sum + toNumber(t.platformFee), 0);
      const transactionCount = mp._count.transactions;

      return {
        id: mp.id,
        name: mp.name,
        feePercent: toNumber(mp.feePercent),
        feeFlat: toNumber(mp.feeFlat),
        description: mp.description,
        isActive: mp.isActive,
        transactionCount,
        totalVolume,
        totalFees,
      };
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get marketplace stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
