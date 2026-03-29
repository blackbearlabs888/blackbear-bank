import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';
import { generateOrderId, calculatePaymentFee } from '@/lib/auth';
import { sendTelegramNotification, formatCurrency } from '@/lib/telegram';
import { checkCustomerDuplicate, normalizePhone } from '@/lib/customer-utils';

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
      partnerId,
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

    // Normalize phone and check for existing customer
    const normalizedPhone = normalizePhone(phone);
    const duplicateCheck = await checkCustomerDuplicate(normalizedPhone, name);
    
    let customer;
    
    if (duplicateCheck.isDuplicate && duplicateCheck.existingCustomer) {
      // Update existing customer with new info
      customer = await db.customer.update({
        where: { id: duplicateCheck.existingCustomer.id },
        data: {
          name, // Update name
          phone: normalizedPhone,
          bankName: bank || duplicateCheck.existingCustomer.bankName,
          bankAccount: bankAccount || duplicateCheck.existingCustomer.bankAccount,
          bankHolder: bankHolder || duplicateCheck.existingCustomer.bankHolder,
          city: city || duplicateCheck.existingCustomer.city,
          // Increment customer stats for new transaction
          totalVolume: { increment: nominal },
          totalTransactions: { increment: 1 },
        },
      });
    } else {
      // Create new customer
      customer = await db.customer.create({
        data: {
          name,
          phone: normalizedPhone,
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
    }

    // Validate partner if provided
    let partnerData = null;
    let partnerRate = 0;
    if (partnerId) {
      partnerData = await db.partner.findUnique({
        where: { id: partnerId },
      });
      if (partnerData && partnerData.status === 'active') {
        partnerRate = Number(partnerData.commission) || 0;
      }
    }

    // Calculate partner profit if partner is assigned
    const partnerProfitAmount = partnerData && partnerRate > 0 ? paymentFee * (partnerRate / 100) : 0;
    const ownerProfitAmount = paymentFee - partnerProfitAmount;

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
        partnerProfit: partnerProfitAmount,
        ownerProfit: ownerProfitAmount,
        totalReceived,
        paymentTypeId,
        methodTransaction,
        status: 'pending',
        partnerId: partnerData?.id || null,
      },
      include: {
        customer: true,
        paymentType: true,
        partner: true,
      },
    });

    // Create notification for owner about new public order
    try {
      await db.notification.create({
        data: {
          type: 'new_order',
          title: 'Order Baru dari Public',
          message: `Order ${orderId} dari ${name} - ${formatCurrency(toNumber(nominal))}`,
          data: JSON.stringify({
            orderId,
            customerName: name,
            customerPhone: normalizedPhone,
            nominal,
            paymentType: paymentType.name,
            methodTransaction,
          }),
          targetType: 'owner',
          transactionId: transaction.id,
        },
      });

      // Send Telegram notification to owner
      const ownerProfile = await db.ownerProfile.findFirst();
      if (ownerProfile) {
        const notifSettings = await db.notificationSettings.findUnique({
          where: { ownerProfileId: ownerProfile.id },
        });

        if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyNewTransaction) {
          await sendTelegramNotification(
            notifSettings.telegramBotToken,
            notifSettings.telegramChatId,
            {
              type: 'new_order',
              title: '💳 Order Baru dari Public',
              message: `Order ID: ${orderId}`,
              additionalData: {
                'Pelanggan': name,
                'Telepon': normalizedPhone,
                'Nominal': formatCurrency(toNumber(nominal)),
                'Fee': formatCurrency(paymentFee),
                'Tipe': paymentType.name,
            'Metode': methodTransaction,
            ...(partnerData ? { 'Partner': partnerData.name } : {}),
              },
            }
          );
        }
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
      // Don't throw - notification failure shouldn't break order creation
    }

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
