import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';
import { generateOrderId, calculatePaymentFee } from '@/lib/auth';
import { sendTelegramNotification, formatCurrency } from '@/lib/telegram';
import { checkCustomerDuplicate, normalizePhone } from '@/lib/customer-utils';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { 
  sanitizeName, 
  sanitizePhone, 
  sanitizeBankAccount, 
  sanitizeCity,
  sanitizeString,
  validateLength, 
  validateNominal, 
  isValidUuid, 
  isValidMethodTransaction,
  isHoneypotTriggered,
  FIELD_LIMITS
} from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ──
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.ORDER_CREATE);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Terlalu banyak request. Coba lagi dalam ${rateLimitResult.retryAfter} detik.` 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    // ── Request Body Validation ──
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Format request tidak valid' },
        { status: 400 }
      );
    }

    // ── Honeypot Check (anti-bot) ──
    if (isHoneypotTriggered(body.website, body.honeypot, body.url)) {
      // Silently reject bots - return success to not reveal the trap
      return NextResponse.json({
        success: true,
        data: { orderId: 'BB-PENDING', status: 'pending' },
        message: 'Order diterima, sedang diproses',
      });
    }

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

    // ── Input Sanitization ──
    const sanitizedName = sanitizeName(name);
    const sanitizedPhone = sanitizePhone(phone);
    const sanitizedBank = typeof bank === 'string' ? sanitizeString(bank) : '';
    const sanitizedBankAccount = sanitizeBankAccount(bankAccount);
    const sanitizedBankHolder = sanitizeName(bankHolder);
    const sanitizedCity = sanitizeCity(city);
    const sanitizedPartnerId = typeof partnerId === 'string' ? partnerId.trim() : '';

    // ── Required Field Validation ──
    if (!sanitizedName || !sanitizedPhone || !nominal || !paymentTypeId || !methodTransaction) {
      return NextResponse.json(
        { success: false, error: 'Field wajib harus diisi: nama, no HP, nominal, tipe pembayaran, metode transaksi' },
        { status: 400 }
      );
    }

    // ── Field Length Validation ──
    const nameCheck = validateLength(sanitizedName, FIELD_LIMITS.NAME_MIN, FIELD_LIMITS.NAME_MAX);
    if (!nameCheck.valid) {
      return NextResponse.json({ success: false, error: `Nama: ${nameCheck.error}` }, { status: 400 });
    }

    const phoneCheck = validateLength(sanitizedPhone, FIELD_LIMITS.PHONE_MIN, FIELD_LIMITS.PHONE_MAX);
    if (!phoneCheck.valid) {
      return NextResponse.json({ success: false, error: `No HP: ${phoneCheck.error}` }, { status: 400 });
    }

    if (sanitizedBank) {
      const bankCheck = validateLength(sanitizedBank, 1, FIELD_LIMITS.BANK_NAME_MAX);
      if (!bankCheck.valid) {
        return NextResponse.json({ success: false, error: `Bank: ${bankCheck.error}` }, { status: 400 });
      }
    }

    if (sanitizedBankAccount) {
      const bankAcctCheck = validateLength(sanitizedBankAccount, FIELD_LIMITS.BANK_ACCOUNT_MIN, FIELD_LIMITS.BANK_ACCOUNT_MAX);
      if (!bankAcctCheck.valid) {
        return NextResponse.json({ success: false, error: `No Rekening: ${bankAcctCheck.error}` }, { status: 400 });
      }
    }

    if (sanitizedBankHolder) {
      const bankHolderCheck = validateLength(sanitizedBankHolder, FIELD_LIMITS.NAME_MIN, FIELD_LIMITS.BANK_HOLDER_MAX);
      if (!bankHolderCheck.valid) {
        return NextResponse.json({ success: false, error: `Nama Rekening: ${bankHolderCheck.error}` }, { status: 400 });
      }
    }

    if (sanitizedCity) {
      const cityCheck = validateLength(sanitizedCity, 2, FIELD_LIMITS.CITY_MAX);
      if (!cityCheck.valid) {
        return NextResponse.json({ success: false, error: `Kota: ${cityCheck.error}` }, { status: 400 });
      }
    }

    // ── Nominal Validation ──
    const nominalResult = validateNominal(nominal);
    if (!nominalResult.valid || !nominalResult.value) {
      return NextResponse.json(
        { success: false, error: nominalResult.error || 'Nominal tidak valid' },
        { status: 400 }
      );
    }
    const safeNominal = nominalResult.value;

    // ── Payment Type ID Validation ──
    if (!isValidUuid(String(paymentTypeId))) {
      return NextResponse.json(
        { success: false, error: 'Tipe pembayaran tidak valid' },
        { status: 400 }
      );
    }

    // ── Method Transaction Validation ──
    if (!isValidMethodTransaction(String(methodTransaction))) {
      return NextResponse.json(
        { success: false, error: 'Metode transaksi tidak valid' },
        { status: 400 }
      );
    }

    // ── Partner ID Validation (optional) ──
    if (sanitizedPartnerId && !isValidUuid(sanitizedPartnerId)) {
      return NextResponse.json(
        { success: false, error: 'ID partner tidak valid' },
        { status: 400 }
      );
    }

    // ── Get payment type ──
    const paymentType = await db.paymentType.findUnique({
      where: { id: String(paymentTypeId) },
    });

    if (!paymentType) {
      return NextResponse.json(
        { success: false, error: 'Tipe pembayaran tidak valid' },
        { status: 400 }
      );
    }

    // ── Calculate payment fee ──
    const paymentFee = calculatePaymentFee(
      safeNominal,
      {
        onlineFeePercent: toNumber(paymentType.onlineFeePercent),
        onlineFeeFlat: toNumber(paymentType.onlineFeeFlat),
        codFeePercent: toNumber(paymentType.codFeePercent),
        codFeeFlat: toNumber(paymentType.codFeeFlat),
        threshold: toNumber(paymentType.threshold),
      },
      String(methodTransaction) as 'Online' | 'COD'
    );
    const totalReceived = safeNominal - paymentFee;

    // ── Normalize phone and check for existing customer ──
    const normalizedPhone = normalizePhone(sanitizedPhone);
    const duplicateCheck = await checkCustomerDuplicate(normalizedPhone, sanitizedName);
    
    let customer;
    
    if (duplicateCheck.isDuplicate && duplicateCheck.existingCustomer) {
      customer = await db.customer.update({
        where: { id: duplicateCheck.existingCustomer.id },
        data: {
          name: sanitizedName,
          phone: normalizedPhone,
          bankName: sanitizedBank || duplicateCheck.existingCustomer.bankName,
          bankAccount: sanitizedBankAccount || duplicateCheck.existingCustomer.bankAccount,
          bankHolder: sanitizedBankHolder || duplicateCheck.existingCustomer.bankHolder,
          city: sanitizedCity || duplicateCheck.existingCustomer.city,
          totalVolume: { increment: safeNominal },
          totalTransactions: { increment: 1 },
        },
      });
    } else {
      customer = await db.customer.create({
        data: {
          name: sanitizedName,
          phone: normalizedPhone,
          bankName: sanitizedBank || null,
          bankAccount: sanitizedBankAccount || null,
          bankHolder: sanitizedBankHolder || null,
          city: sanitizedCity || null,
          label: 'New',
          addedBy: 'public',
          totalVolume: safeNominal,
          totalTransactions: 1,
        },
      });
    }

    // ── Validate partner if provided ──
    let partnerData = null;
    let partnerRate = 0;
    if (sanitizedPartnerId) {
      partnerData = await db.partner.findUnique({
        where: { id: sanitizedPartnerId },
      });
      if (partnerData && partnerData.status === 'active') {
        partnerRate = Number(partnerData.commission) || 0;
      }
    }

    // ── Calculate partner profit ──
    const partnerProfitAmount = partnerData && partnerRate > 0 ? paymentFee * (partnerRate / 100) : 0;
    const ownerProfitAmount = paymentFee - partnerProfitAmount;

    // ── Generate order ID ──
    const orderId = generateOrderId();

    // ── Create transaction ──
    const transaction = await db.transaction.create({
      data: {
        orderId,
        customerId: customer.id,
        nominal: safeNominal,
        paymentFee,
        platformFee: 0,
        netMargin: paymentFee,
        partnerProfit: partnerProfitAmount,
        ownerProfit: ownerProfitAmount,
        totalReceived,
        paymentTypeId: String(paymentTypeId),
        methodTransaction: String(methodTransaction),
        status: 'pending',
        partnerId: partnerData?.id || null,
      },
      include: {
        customer: true,
        paymentType: true,
        partner: true,
      },
    });

    // ── Notification ──
    try {
      await db.notification.create({
        data: {
          type: 'new_order',
          title: 'Order Baru dari Public',
          message: `Order ${orderId} dari ${sanitizedName} - ${formatCurrency(toNumber(safeNominal))}`,
          data: JSON.stringify({
            orderId,
            customerName: sanitizedName,
            customerPhone: normalizedPhone,
            nominal: safeNominal,
            paymentType: paymentType.name,
            methodTransaction,
          }),
          targetType: 'owner',
          transactionId: transaction.id,
        },
      });

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
                'Pelanggan': sanitizedName,
                'Telepon': normalizedPhone,
                'Nominal': formatCurrency(toNumber(safeNominal)),
                'Fee': formatCurrency(paymentFee),
                'Tipe': paymentType.name,
                'Metode': String(methodTransaction),
                ...(partnerData ? { 'Partner': partnerData.name } : {}),
              },
            }
          );
        }
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
