import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';

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

    const [transaction, ownerProfile] = await Promise.all([
      db.transaction.findUnique({
        where: { orderId },
        include: {
          customer: true,
          paymentType: true,
          partner: true,
        },
      }),
      db.ownerProfile.findFirst(),
    ]);

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
        nominal: toNumber(transaction.nominal),
        paymentFee: toNumber(transaction.paymentFee),
        totalReceived: toNumber(transaction.totalReceived),
        status: transaction.status,
        notes: transaction.notes || null,
        customer: {
          name: transaction.customer.name,
          phone: transaction.customer.phone,
          bankName: transaction.customer.bankName,
          bankAccount: transaction.customer.bankAccount,
          bankHolder: transaction.customer.bankHolder,
          city: transaction.customer.city,
        },
        paymentType: transaction.paymentType.name,
        methodTransaction: transaction.methodTransaction,
        partner: transaction.partner?.name || null,
        partnerPhone: transaction.partner?.phone || null,
        ownerWhatsapp: ownerProfile?.footerWhatsapp || null,
        transactionLink: transaction.transactionLink || null,
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
