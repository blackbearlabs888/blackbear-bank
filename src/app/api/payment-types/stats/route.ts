import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET payment types usage stats
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    // Get all payment types with their transaction stats
    const paymentTypes = await db.paymentType.findMany({
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
            paymentFee: true,
            methodTransaction: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const stats = paymentTypes.map((pt) => {
      const totalVolume = pt.transactions.reduce((sum, t) => sum + t.nominal, 0);
      const totalFees = pt.transactions.reduce((sum, t) => sum + t.paymentFee, 0);
      const transactionCount = pt._count.transactions;

      // Count by method
      const onlineCount = pt.transactions.filter(t => t.methodTransaction === 'Online').length;
      const codCount = pt.transactions.filter(t => t.methodTransaction === 'COD').length;

      return {
        id: pt.id,
        name: pt.name,
        onlineFeePercent: pt.onlineFeePercent,
        onlineFeeFlat: pt.onlineFeeFlat,
        codFeePercent: pt.codFeePercent,
        codFeeFlat: pt.codFeeFlat,
        threshold: pt.threshold,
        isActive: pt.isActive,
        transactionCount,
        onlineCount,
        codCount,
        totalVolume,
        totalFees,
      };
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get payment types stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
