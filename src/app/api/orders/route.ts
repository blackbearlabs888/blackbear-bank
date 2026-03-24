import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';
import { generateOrderId, calculatePaymentFee } from '@/lib/auth';

// Helper to safely create notification
async function createNotification(data: {
  type: string;
  title: string;
  message: string;
  data?: string;
  targetType: string;
  transactionId?: string;
  partnerId?: string;
}) {
  try {
    // Check if notification model exists
    if ('notification' in db && typeof db.notification?.create === 'function') {
      await db.notification.create({ data });
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notification failure shouldn't break the main flow
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      bank,
      bankAccount,
      bankHolder,
      nominal,
      paymentTypeId,
      methodTransaction,
      city,
    } = body;

    // Validation
    if (!name || !phone || !nominal || !paymentTypeId || !methodTransaction) {
      return NextResponse.json(
        { success: false, error: 'Field wajib harus diisi' },
        { status: 400 }
      );
    }

    if (nominal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Nominal harus lebih dari 0' },
        { status: 400 }
      );
    }

    // Get payment type
    const paymentType = await db.paymentType.findUnique({
      where: { id: paymentTypeId },
    });

    if (!paymentType) {
      return NextResponse.json(
        { success: false, error: 'Tipe pembayaran tidak valid' },
        { status: 400 }
      );
    }

    // Calculate payment fee
    // Convert Decimal values to numbers for PostgreSQL compatibility
    const paymentFee = calculatePaymentFee(
      toNumber(nominal),
      {
        onlineFeePercent: toNumber(paymentType.onlineFeePercent),
        onlineFeeFlat: toNumber(paymentType.onlineFeeFlat),
        codFeePercent: toNumber(paymentType.codFeePercent),
        codFeeFlat: toNumber(paymentType.codFeeFlat),
        threshold: toNumber(paymentType.threshold),
      },
      methodTransaction
    );
    const totalReceived = toNumber(nominal) - paymentFee;

    // Check if customer exists (handle various phone formats)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    let customer = await db.customer.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: cleanPhone.replace(/^0/, '62') },
          { phone: cleanPhone.replace(/^62/, '0') },
          { phone: `0${cleanPhone.replace(/^62/, '')}` },
          { phone: `62${cleanPhone.replace(/^0/, '')}` },
        ],
      },
    });

    // Create or update customer
    if (!customer) {
      customer = await db.customer.create({
        data: {
          name,
          phone: cleanPhone,
          bankName: bank || null,
          bankAccount: bankAccount || null,
          bankHolder: bankHolder || null,
          city: city || null,
          label: 'New',
          addedBy: 'public',
          totalVolume: nominal,
          totalTransactions: 1,
        },
      });
    } else {
      // Update customer info if provided
      if (bank || bankAccount || bankHolder || city || name !== customer.name) {
        customer = await db.customer.update({
          where: { id: customer.id },
          data: {
            name,
            bankName: bank || customer.bankName,
            bankAccount: bankAccount || customer.bankAccount,
            bankHolder: bankHolder || customer.bankHolder,
            city: city || customer.city,
            // Increment customer stats for new transaction
            totalVolume: { increment: nominal },
            totalTransactions: { increment: 1 },
          },
        });
      } else {
        // Still increment stats even if no other updates
        customer = await db.customer.update({
          where: { id: customer.id },
          data: {
            totalVolume: { increment: nominal },
            totalTransactions: { increment: 1 },
          },
        });
      }
    }

    // Generate order ID
    const orderId = generateOrderId();

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        orderId,
        customerId: customer.id,
        nominal,
        paymentFee,
        platformFee: 0,
        netMargin: paymentFee,
        partnerProfit: 0,
        ownerProfit: paymentFee,
        totalReceived,
        paymentTypeId,
        methodTransaction,
        status: 'pending',
      },
      include: {
        customer: true,
        paymentType: true,
      },
    });

    // Create notification for owner about new public order
    await createNotification({
      type: 'new_order',
      title: 'Order Baru dari Public',
      message: `Order ${orderId} dari ${name} - Rp ${nominal.toLocaleString('id-ID')}`,
      data: JSON.stringify({
        orderId,
        customerName: name,
        customerPhone: cleanPhone,
        nominal,
        paymentType: paymentType.name,
        methodTransaction,
      }),
      targetType: 'owner',
      transactionId: transaction.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: transaction.orderId,
        nominal: transaction.nominal,
        paymentFee: transaction.paymentFee,
        totalReceived: transaction.totalReceived,
        status: transaction.status,
        customer: transaction.customer,
        paymentType: transaction.paymentType.name,
        methodTransaction: transaction.methodTransaction,
        createdAt: transaction.createdAt,
      },
      message: 'Order berhasil dibuat',
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
