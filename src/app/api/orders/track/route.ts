import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID diperlukan' },
        { status: 400 }
      );
    }

    const transaction = await db.transaction.findUnique({
      where: { orderId },
      include: {
        customer: true,
        paymentType: true,
        partner: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: transaction.orderId,
        nominal: transaction.nominal,
        paymentFee: transaction.paymentFee,
        totalReceived: transaction.totalReceived,
        status: transaction.status,
        customer: {
          name: transaction.customer.name,
          bankName: transaction.customer.bankName,
          bankAccount: transaction.customer.bankAccount,
        },
        paymentType: transaction.paymentType.name,
        methodTransaction: transaction.methodTransaction,
        partner: transaction.partner?.name || null,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error('Track order error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
