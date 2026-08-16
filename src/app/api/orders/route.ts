import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';
import { generateOrderId } from '@/lib/auth';
import { calculateTransaction, CALCULATION_VERSION_PHASE2 } from '@/lib/transaction/fee';
import {
  prepareIdempotency,
  isUniqueConstraintViolation,
} from '@/lib/transaction/idempotency';
import { sendTelegramNotification, formatCurrency } from '@/lib/telegram';
import { checkCustomerDuplicate, normalizePhone } from '@/lib/customer-utils';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { persistFraudAssessment } from '@/lib/fraud/service';
import {
  sanitizeName,
  sanitizePhone,
  sanitizeBankAccount,
  sanitizeCity,
  sanitizeString,
  validateLength,
  validateNominal,
  isValidCuid,
  isValidMethodTransaction,
  isHoneypotTriggered,
  FIELD_LIMITS,
} from '@/lib/sanitize';
import { withObservability } from '@/lib/observability/request-id';
import {
  logWarn,
  logError,
  logTransactionEvent,
} from '@/lib/observability/logger';
import {
  apiError,
  apiErrorFrom,
  apiValidationError,
  apiRateLimited,
  ErrorCode,
} from '@/lib/observability/errors';

export const POST = withObservability(async (request: NextRequest) => {
  try {
    // ── Rate Limiting ──
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.ORDER_CREATE);

    if (!rateLimitResult.success) {
      return apiRateLimited(rateLimitResult.retryAfter);
    }

    // ── Request Body Validation ──
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiValidationError('Format request tidak valid');
    }

    // ── Honeypot Check (anti-bot) ──
    // Check each honeypot field individually - any filled field triggers bot detection
    if (isHoneypotTriggered(body.website) || isHoneypotTriggered(body.honeypot) || isHoneypotTriggered(body.url)) {
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
      return apiValidationError('Field wajib harus diisi: nama, no HP, nominal, tipe pembayaran, metode transaksi');
    }

    // ── Field Length Validation ──
    const nameCheck = validateLength(sanitizedName, FIELD_LIMITS.NAME_MIN, FIELD_LIMITS.NAME_MAX);
    if (!nameCheck.valid) {
      return apiValidationError(`Nama: ${nameCheck.error}`);
    }

    const phoneCheck = validateLength(sanitizedPhone, FIELD_LIMITS.PHONE_MIN, FIELD_LIMITS.PHONE_MAX);
    if (!phoneCheck.valid) {
      return apiValidationError(`No HP: ${phoneCheck.error}`);
    }

    if (sanitizedBank) {
      const bankCheck = validateLength(sanitizedBank, 1, FIELD_LIMITS.BANK_NAME_MAX);
      if (!bankCheck.valid) {
        return apiValidationError(`Bank: ${bankCheck.error}`);
      }
    }

    if (sanitizedBankAccount) {
      const bankAcctCheck = validateLength(sanitizedBankAccount, FIELD_LIMITS.BANK_ACCOUNT_MIN, FIELD_LIMITS.BANK_ACCOUNT_MAX);
      if (!bankAcctCheck.valid) {
        return apiValidationError(`No Rekening: ${bankAcctCheck.error}`);
      }
    }

    if (sanitizedBankHolder) {
      const bankHolderCheck = validateLength(sanitizedBankHolder, FIELD_LIMITS.NAME_MIN, FIELD_LIMITS.BANK_HOLDER_MAX);
      if (!bankHolderCheck.valid) {
        return apiValidationError(`Nama Rekening: ${bankHolderCheck.error}`);
      }
    }

    if (sanitizedCity) {
      const cityCheck = validateLength(sanitizedCity, 2, FIELD_LIMITS.CITY_MAX);
      if (!cityCheck.valid) {
        return apiValidationError(`Kota: ${cityCheck.error}`);
      }
    }

    // ── Nominal Validation ──
    const nominalResult = validateNominal(nominal);
    if (!nominalResult.valid || !nominalResult.value) {
      return apiValidationError(nominalResult.error || 'Nominal tidak valid');
    }
    const safeNominal = nominalResult.value;

    // ── Payment Type ID Validation ──
    if (!isValidCuid(String(paymentTypeId))) {
      return apiValidationError('Tipe pembayaran tidak valid');
    }

    // ── Method Transaction Validation ──
    if (!isValidMethodTransaction(String(methodTransaction))) {
      return apiValidationError('Metode transaksi tidak valid');
    }

    // ── Partner ID Validation (optional) ──
    if (sanitizedPartnerId && !isValidCuid(sanitizedPartnerId)) {
      return apiValidationError('ID partner tidak valid');
    }

    // ── Get payment type (must be active) ──
    const paymentType = await db.paymentType.findFirst({
      where: { id: String(paymentTypeId), isActive: true },
    });

    if (!paymentType) {
      return apiValidationError('Tipe pembayaran tidak valid');
    }

    // ── Validate partner if provided ──
    let partnerData = null;
    if (sanitizedPartnerId) {
      partnerData = await db.partner.findUnique({
        where: { id: sanitizedPartnerId },
      });
      if (!partnerData || partnerData.status !== 'active') {
        partnerData = null;
      }
    }

    // ── Consolidated fee calculation (Phase 2 single source) ──
    const calc = calculateTransaction({
      nominal: safeNominal,
      paymentType: paymentType as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
      marketplace: null, // public orders never have marketplace
      partner: partnerData ? { commission: partnerData.commission } : null,
      methodTransaction: String(methodTransaction),
    });

    // ── Idempotency check ──
    const idem = prepareIdempotency(request.headers, body);
    if (idem.key) {
      const existing = await db.transaction.findUnique({
        where: { idempotencyKey: idem.key },
        include: { customer: true, paymentType: true, partner: true },
      });
      if (existing) {
        if (existing.idempotencyHash !== idem.hash) {
          // Idempotency key reuse with different payload — conflict
          logTransactionEvent('transaction.idempotency_conflict', {
            transactionId: existing.id,
            orderId: existing.orderId,
            actorRole: 'public',
            errorCode: ErrorCode.IDEMPOTENCY_CONFLICT,
            message: 'Idempotency key reuse with different payload',
          });
          return apiError({
            status: 409,
            code: ErrorCode.IDEMPOTENCY_CONFLICT,
            message: 'Idempotency key sudah digunakan untuk payload yang berbeda',
          });
        }
        // Idempotent replay — return the existing transaction
        logTransactionEvent('transaction.replayed', {
          transactionId: existing.id,
          orderId: existing.orderId,
          actorRole: 'public',
          message: 'Idempotency replay — returning existing transaction',
        });
        return NextResponse.json({
          success: true,
          data: {
            orderId: existing.orderId,
            nominal: toNumber(existing.nominal),
            paymentFee: toNumber(existing.paymentFee),
            totalReceived: toNumber(existing.totalReceived),
            status: existing.status,
            customer: existing.customer,
            paymentType: existing.paymentType?.name,
            methodTransaction: existing.methodTransaction,
            createdAt: existing.createdAt,
          },
          message: 'Order sudah dibuat sebelumnya (idempotent replay)',
        });
      }
    }

    // ── Normalize phone and check for existing customer ──
    const normalizedPhone = normalizePhone(sanitizedPhone);
    const duplicateCheck = await checkCustomerDuplicate(normalizedPhone, sanitizedName);

    // ── Generate order ID ──
    const orderId = generateOrderId();

    // ── Create transaction + customer stats atomically ──
    let transaction;
    try {
      transaction = await db.$transaction(async (tx) => {
        // ── Customer upsert with stats increment ──
        let customer;
        if (duplicateCheck.isDuplicate && duplicateCheck.existingCustomer) {
          customer = await tx.customer.update({
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
          customer = await tx.customer.create({
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

        // ── Create transaction with snapshot + idempotency ──
        const createdTx = await tx.transaction.create({
          data: {
            orderId,
            customerId: customer.id,
            nominal: calc.nominal,
            paymentFee: calc.paymentFee,
            originalFee: calc.originalFee,
            discountPercent: calc.discountPercent,
            discountAmount: calc.discountAmount,
            platformFee: calc.platformFee,
            netMargin: calc.netMargin,
            partnerProfit: calc.partnerProfit,
            ownerProfit: calc.ownerProfit,
            totalReceived: calc.totalReceived,
            paymentTypeId: String(paymentTypeId),
            methodTransaction: String(methodTransaction),
            status: 'pending',
            partnerId: partnerData?.id || null,
            // Phase 2 snapshot fields
            partnerCommissionPercent: calc.partnerCommissionPercent,
            paymentTypeName: calc.paymentTypeName,
            marketplaceName: calc.marketplaceName,
            feeConfigSnapshot: calc.feeConfigSnapshot,
            calculationVersion: CALCULATION_VERSION_PHASE2,
            // Idempotency
            idempotencyKey: idem.key,
            idempotencyHash: idem.hash,
            // Phase 5: commissionStatus = not_applicable when no partner.
            // When a partner IS linked, the fraud assessment below overwrites
            // this to 'pending' (clear) or 'held' (review).
            commissionStatus: partnerData?.id ? 'pending' : 'not_applicable',
          },
          include: {
            customer: true,
            paymentType: true,
            partner: true,
          },
        });

        // ── Phase 5: Run fraud assessment (only when a partner is linked) ──
        if (partnerData?.id) {
          await persistFraudAssessment(
            tx,
            {
              transactionId: createdTx.id,
              orderId: createdTx.orderId,
              partnerId: partnerData.id,
              customerId: customer.id,
              customer: {
                phone: customer.phone,
                bankAccount: customer.bankAccount,
                bankHolder: customer.bankHolder,
                name: customer.name,
                city: customer.city,
                createdAt: customer.createdAt,
              },
              transactionCreatedAt: createdTx.createdAt,
            },
            { actorType: 'system' },
          );

          // Re-fetch to include fraud fields in the response.
          const refreshed = await tx.transaction.findUniqueOrThrow({
            where: { id: createdTx.id },
            include: {
              customer: true,
              paymentType: true,
              partner: true,
            },
          });
          return refreshed;
        }

        return createdTx;
      });

      // ── Phase 3 observability: emit order.created (DB transaction committed) ──
      logTransactionEvent('order.created', {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        actorRole: 'public',
        monetary: {
          nominal: calc.nominal,
          paymentFee: calc.paymentFee,
          partnerProfit: calc.partnerProfit,
          ownerProfit: calc.ownerProfit,
        },
      });
    } catch (error) {
      // Handle concurrent idempotency key insertion (P2002 unique constraint)
      if (isUniqueConstraintViolation(error) && idem.key) {
        const existing = await db.transaction.findUnique({
          where: { idempotencyKey: idem.key },
          include: { customer: true, paymentType: true, partner: true },
        });
        if (existing && existing.idempotencyHash === idem.hash) {
          // Concurrent duplicate insert — replay existing
          logTransactionEvent('transaction.replayed', {
            transactionId: existing.id,
            orderId: existing.orderId,
            actorRole: 'public',
            message: 'Idempotency replay — returning existing transaction (P2002 race)',
          });
          return NextResponse.json({
            success: true,
            data: {
              orderId: existing.orderId,
              nominal: toNumber(existing.nominal),
              paymentFee: toNumber(existing.paymentFee),
              totalReceived: toNumber(existing.totalReceived),
              status: existing.status,
              customer: existing.customer,
              paymentType: existing.paymentType?.name,
              methodTransaction: existing.methodTransaction,
              createdAt: existing.createdAt,
            },
            message: 'Order sudah dibuat sebelumnya (idempotent replay)',
          });
        }
        if (existing && existing.idempotencyHash !== idem.hash) {
          logTransactionEvent('transaction.idempotency_conflict', {
            transactionId: existing.id,
            orderId: existing.orderId,
            actorRole: 'public',
            errorCode: ErrorCode.IDEMPOTENCY_CONFLICT,
            message: 'Idempotency key reuse with different payload (P2002 race)',
          });
          return apiError({
            status: 409,
            code: ErrorCode.IDEMPOTENCY_CONFLICT,
            message: 'Idempotency key sudah digunakan untuk payload yang berbeda',
          });
        }
      }
      throw error;
    }

    // ── Notification (outside transaction — fail-after-commit, non-critical) ──
    // DB transaction has already committed above. Telegram send failure MUST NOT
    // roll back the order — log a warn and continue.
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
          // ── Telegram send (HTTP) — fail-after-commit pattern ──
          // If this throws, the order is already persisted. Log a warn, do NOT
          // roll back the DB transaction.
          try {
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
                  'Fee': formatCurrency(calc.paymentFee),
                  'Tipe': paymentType.name,
                  'Metode': String(methodTransaction),
                  ...(partnerData ? { 'Partner': partnerData.name } : {}),
                },
              }
            );
          } catch (telegramError) {
            logWarn({
              event: 'telegram.send_failed',
              errorCode: ErrorCode.TELEGRAM_SEND_FAILED,
              message: 'Telegram notification failed after successful order creation',
              orderId,
              transactionId: transaction.id,
              data: { orderId },
            });
          }
        }
      }
    } catch (notifError) {
      // In-app notification record creation failed — non-critical, log and continue.
      logWarn({
        event: 'notification.create_failed',
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to create in-app notification record',
        orderId,
        transactionId: transaction.id,
        data: { orderId },
      });
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
    logError({
      event: 'order.create_failed',
      errorCode: ErrorCode.TRANSACTION_CREATE_FAILED,
      data: { error },
    });
    return apiErrorFrom(error, ErrorCode.TRANSACTION_CREATE_FAILED, 'Gagal membuat order');
  }
});
