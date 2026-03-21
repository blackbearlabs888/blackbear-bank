import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOrderId, calculatePaymentFee } from '@/lib/auth';

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
    const paymentFee = calculatePaymentFee(nominal, paymentType, methodTransaction);
    const totalReceived = nominal - paymentFee;

    // Check if customer exists
    let customer = await db.customer.findFirst({
      where: { phone },
    });

    // Create or update customer
    if (!customer) {
      customer = await db.customer.create({
        data: {
          name,
          phone,
          bankName: bank || null,
          bankAccount: bankAccount || null,
          bankHolder: bankHolder || null,
          city: city || null,
          label: 'New',
        },
      });
    } else {
      // Update customer info if provided
      if (bank || bankAccount || bankHolder || city) {
        customer = await db.customer.update({
          where: { id: customer.id },
          data: {
            name,
            bankName: bank || customer.bankName,
            bankAccount: bankAccount || customer.bankAccount,
            bankHolder: bankHolder || customer.bankHolder,
            city: city || customer.city,
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
