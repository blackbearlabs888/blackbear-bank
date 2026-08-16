import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { generateOrderId } from '@/lib/auth';
import { sendTelegramNotification, formatCurrency } from '@/lib/telegram';
import { checkCustomerDuplicate, normalizePhone } from '@/lib/customer-utils';
import { sanitizeName, sanitizePhone, sanitizeBankAccount, sanitizeCity, sanitizeString, validateLength, isValidCuid, isValidMethodTransaction, FIELD_LIMITS } from '@/lib/sanitize';
import { calculateTransaction, CALCULATION_VERSION_PHASE2 } from '@/lib/transaction/fee';
import {
  prepareIdempotency,
  isUniqueConstraintViolation,
} from '@/lib/transaction/idempotency';
import { persistFraudAssessment } from '@/lib/fraud/service';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import {
  logWarn,
  logError,
  logInfo,
  logTransactionEvent,
} from '@/lib/observability/logger';
import {
  apiError,
  apiErrorFrom,
  apiValidationError,
  apiUnauthenticated,
  ErrorCode,
} from '@/lib/observability/errors';

// Helper to serialize transaction with Decimal fields
function serializeTransaction(tx: Record<string, unknown>) {
  return {
    ...tx,
    nominal: toNumber(tx.nominal),
    paymentFee: toNumber(tx.paymentFee),
    originalFee: toNumber(tx.originalFee),
    discountPercent: toNumber(tx.discountPercent),
    discountAmount: toNumber(tx.discountAmount),
    platformFee: toNumber(tx.platformFee),
    netMargin: toNumber(tx.netMargin),
    partnerProfit: toNumber(tx.partnerProfit),
    ownerProfit: toNumber(tx.ownerProfit),
    totalReceived: toNumber(tx.totalReceived),
    // Phase 5: fraud + commission fields
    fraudRiskScore: typeof tx.fraudRiskScore === 'number' ? tx.fraudRiskScore : 0,
    fraudRiskLevel: typeof tx.fraudRiskLevel === 'string' ? tx.fraudRiskLevel : 'low',
    fraudStatus: typeof tx.fraudStatus === 'string' ? tx.fraudStatus : 'clear',
    fraudReasons: tx.fraudReasons ?? null,
    commissionStatus: typeof tx.commissionStatus === 'string' ? tx.commissionStatus : 'pending',
    commissionApprovedAmount: toNumber(tx.commissionApprovedAmount),
    customer: tx.customer ? {
      ...tx.customer as object,
      totalVolume: toNumber((tx.customer as Record<string, unknown>).totalVolume),
    } : null,
    paymentType: tx.paymentType ? {
      ...tx.paymentType as object,
      onlineFeePercent: toNumber((tx.paymentType as Record<string, unknown>).onlineFeePercent),
      onlineFeeFlat: toNumber((tx.paymentType as Record<string, unknown>).onlineFeeFlat),
      codFeePercent: toNumber((tx.paymentType as Record<string, unknown>).codFeePercent),
      codFeeFlat: toNumber((tx.paymentType as Record<string, unknown>).codFeeFlat),
      threshold: toNumber((tx.paymentType as Record<string, unknown>).threshold),
      discountPercent: toNumber((tx.paymentType as Record<string, unknown>).discountPercent),
      discountNominal: toNumber((tx.paymentType as Record<string, unknown>).discountNominal),
      minTransaction: toNumber((tx.paymentType as Record<string, unknown>).minTransaction),
    } : null,
    marketplace: tx.marketplace ? {
      ...tx.marketplace as object,
      feePercent: toNumber((tx.marketplace as Record<string, unknown>).feePercent),
      feeFlat: toNumber((tx.marketplace as Record<string, unknown>).feeFlat),
    } : null,
    partner: tx.partner ? {
      ...tx.partner as object,
      commission: toNumber((tx.partner as Record<string, unknown>).commission),
      target: toNumber((tx.partner as Record<string, unknown>).target),
      totalProfit: toNumber((tx.partner as Record<string, unknown>).totalProfit),
      totalVolume: toNumber((tx.partner as Record<string, unknown>).totalVolume),
    } : null,
  };
}

// GET transactions with pagination
export const GET = withObservability(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }
    updateActor(user.role, user.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const days = searchParams.get('days');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      where.partnerId = partner?.id;
    }

    if (status) {
      where.status = status;
    }

    // Filter by days (e.g., last 30 days)
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      where.createdAt = { gte: daysAgo };
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          customer: true,
          paymentType: true,
          marketplace: true,
          partner: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Serialize transactions to convert Decimal fields to numbers
    const serializedTransactions = transactions.map(serializeTransaction);

    return NextResponse.json({
      success: true,
      data: serializedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    logError({
      event: 'transaction.list_failed',
      errorCode: ErrorCode.INTERNAL_ERROR,
      data: { error },
    });
    return apiErrorFrom(error, ErrorCode.INTERNAL_ERROR, 'Terjadi kesalahan server');
  }
});

// POST create transaction
export const POST = withObservability(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }
    updateActor(user.role, user.id);

    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      customerCity,
      customerBankName,
      customerBankAccount,
      customerBankHolder,
      isNewCustomer,
      nominal,
      paymentTypeId,
      methodTransaction,
      marketplaceId,
      partnerId,
    } = body;

    // ── Input Sanitization ──
    const sanitizedName = customerName ? sanitizeName(customerName) : '';
    const sanitizedPhone = customerPhone ? sanitizePhone(customerPhone) : '';
    const sanitizedCity = customerCity ? sanitizeCity(customerCity) : '';
    const sanitizedBankName = customerBankName ? sanitizeString(customerBankName) : '';
    const sanitizedBankAccount = customerBankAccount ? sanitizeBankAccount(customerBankAccount) : '';
    const sanitizedBankHolder = customerBankHolder ? sanitizeName(customerBankHolder) : '';

    // Validation
    if (!nominal || !paymentTypeId || !methodTransaction) {
      return apiValidationError('Field wajib harus diisi');
    }

    // For existing customer, customerId is required
    if (!isNewCustomer && !customerId) {
      return apiValidationError('Customer harus dipilih');
    }

    // For new customer, name and phone are required
    if (isNewCustomer && (!sanitizedName || !sanitizedPhone)) {
      return apiValidationError('Nama dan nomor customer harus diisi');
    }

    // Get payment type
    const paymentType = await db.paymentType.findUnique({
      where: { id: paymentTypeId },
    });

    if (!paymentType) {
      return apiValidationError('Tipe pembayaran tidak valid');
    }

    // Get marketplace if provided
    const effectiveMarketplaceId = (marketplaceId && marketplaceId !== 'none') ? marketplaceId : null;
    let marketplace = null;
    if (effectiveMarketplaceId) {
      marketplace = await db.marketplace.findUnique({
        where: { id: effectiveMarketplaceId },
      });
    }

    // Get partner
    let actualPartnerId = partnerId || null;
    let partner = null;

    if (user.role === 'partner') {
      partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      actualPartnerId = partner?.id || null;
    } else if (partnerId) {
      partner = await db.partner.findUnique({
        where: { id: partnerId },
      });
    }

    // ── Consolidated fee calculation (Phase 2 single source) ──
    const calc = calculateTransaction({
      nominal: toNumber(nominal),
      paymentType: paymentType as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
      marketplace: marketplace ? { name: marketplace.name, feePercent: marketplace.feePercent, feeFlat: marketplace.feeFlat } : null,
      partner: partner ? { commission: partner.commission } : null,
      methodTransaction,
    });

    // ── Idempotency check ──
    const idem = prepareIdempotency(request.headers, body);
    if (idem.key) {
      const existing = await db.transaction.findUnique({
        where: { idempotencyKey: idem.key },
        include: { customer: true, paymentType: true, partner: true, marketplace: true },
      });
      if (existing) {
        if (existing.idempotencyHash !== idem.hash) {
          logTransactionEvent('transaction.idempotency_conflict', {
            transactionId: existing.id,
            orderId: existing.orderId,
            actorRole: user.role,
            errorCode: ErrorCode.IDEMPOTENCY_CONFLICT,
            message: 'Idempotency key reuse with different payload',
          });
          return apiError({
            status: 409,
            code: ErrorCode.IDEMPOTENCY_CONFLICT,
            message: 'Idempotency key sudah digunakan untuk payload yang berbeda',
          });
        }
        logTransactionEvent('transaction.replayed', {
          transactionId: existing.id,
          orderId: existing.orderId,
          actorRole: user.role,
          message: 'Idempotency replay — returning existing transaction',
        });
        return NextResponse.json({
          success: true,
          data: serializeTransaction(existing as unknown as Record<string, unknown>),
          message: 'Transaksi sudah dibuat sebelumnya (idempotent replay)',
        });
      }
    }

    // Generate order ID
    const orderId = generateOrderId();

    // Default status: "process" for owner, "pending" for partner/public
    const defaultStatus = user.role === 'owner' ? 'process' : 'pending';

    // ── Create transaction + customer stats atomically ──
    let transaction;
    try {
      transaction = await db.$transaction(async (tx) => {
        // Handle customer - create new or use existing
        let finalCustomerId = customerId;

        if (isNewCustomer) {
          const normalizedPhone = normalizePhone(sanitizedPhone);
          const duplicateCheck = await checkCustomerDuplicate(normalizedPhone, sanitizedName);

          if (duplicateCheck.isDuplicate && duplicateCheck.existingCustomer) {
            finalCustomerId = duplicateCheck.existingCustomer.id;
            await tx.customer.update({
              where: { id: finalCustomerId },
              data: {
                name: sanitizedName,
                phone: normalizedPhone,
                city: sanitizedCity || undefined,
                bankName: sanitizedBankName || undefined,
                bankAccount: sanitizedBankAccount || undefined,
                bankHolder: sanitizedBankHolder || undefined,
                partnerId: user.role === 'partner' ? actualPartnerId : undefined,
              },
            });
          } else {
            const newCustomer = await tx.customer.create({
              data: {
                name: sanitizedName,
                phone: normalizedPhone,
                city: sanitizedCity || null,
                bankName: sanitizedBankName || null,
                bankAccount: sanitizedBankAccount || null,
                bankHolder: sanitizedBankHolder || null,
                totalVolume: 0,
                totalTransactions: 0,
                addedBy: user.role === 'owner' ? 'owner' : 'partner',
                partnerId: user.role === 'partner' ? actualPartnerId : null,
              },
            });
            finalCustomerId = newCustomer.id;
          }
        }

        // Create transaction with snapshot + idempotency
        const created = await tx.transaction.create({
          data: {
            orderId,
            customerId: finalCustomerId,
            partnerId: actualPartnerId,
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
            paymentTypeId,
            methodTransaction,
            marketplaceId: effectiveMarketplaceId,
            status: defaultStatus,
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
            // this to 'pending' (clear) or 'held' (review) or 'rejected' (confirmed).
            commissionStatus: actualPartnerId ? 'pending' : 'not_applicable',
          },
          include: {
            customer: true,
            paymentType: true,
            partner: true,
            marketplace: true,
          },
        });

        // Update customer stats (always track customer activity)
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: {
            totalVolume: { increment: toNumber(nominal) },
            totalTransactions: { increment: 1 },
          },
        });

        // ── Phase 5: Run fraud assessment (only when a partner is linked) ──
        // Sets fraudRiskScore/Level/Status, fraudReasons, commissionStatus.
        // Appends a FraudReviewEvent. Auto-suspends partner on critical signal.
        // For transactions with no partner, commissionStatus stays 'not_applicable'
        // and no assessment is performed (per directive).
        if (actualPartnerId) {
          // Fetch the customer row to get identity for fraud assessment.
          const customerForFraud = await tx.customer.findUniqueOrThrow({
            where: { id: finalCustomerId },
            select: {
              phone: true,
              bankAccount: true,
              bankHolder: true,
              name: true,
              city: true,
              createdAt: true,
            },
          });
          await persistFraudAssessment(
            tx,
            {
              transactionId: created.id,
              orderId: created.orderId,
              partnerId: actualPartnerId,
              customerId: finalCustomerId,
              customer: {
                phone: customerForFraud.phone,
                bankAccount: customerForFraud.bankAccount,
                bankHolder: customerForFraud.bankHolder,
                name: customerForFraud.name,
                city: customerForFraud.city,
                createdAt: customerForFraud.createdAt,
              },
              transactionCreatedAt: created.createdAt,
            },
            { actorType: 'system' },
          );

          // Re-fetch the transaction to include the fraud fields in the response.
          const refreshed = await tx.transaction.findUniqueOrThrow({
            where: { id: created.id },
            include: {
              customer: true,
              paymentType: true,
              partner: true,
              marketplace: true,
            },
          });
          return refreshed;
        }

        return created;
      });

      // ── Phase 3 observability: emit transaction.created (DB committed) ──
      logTransactionEvent('transaction.created', {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        actorRole: user.role,
        monetary: {
          nominal: calc.nominal,
          paymentFee: calc.paymentFee,
          partnerProfit: calc.partnerProfit,
          ownerProfit: calc.ownerProfit,
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error) && idem.key) {
        const existing = await db.transaction.findUnique({
          where: { idempotencyKey: idem.key },
          include: { customer: true, paymentType: true, partner: true, marketplace: true },
        });
        if (existing && existing.idempotencyHash === idem.hash) {
          // Concurrent duplicate insert — replay existing
          logTransactionEvent('transaction.replayed', {
            transactionId: existing.id,
            orderId: existing.orderId,
            actorRole: user.role,
            message: 'Idempotency replay — returning existing transaction (P2002 race)',
          });
          return NextResponse.json({
            success: true,
            data: serializeTransaction(existing as unknown as Record<string, unknown>),
            message: 'Transaksi sudah dibuat sebelumnya (idempotent replay)',
          });
        }
        if (existing && existing.idempotencyHash !== idem.hash) {
          logTransactionEvent('transaction.idempotency_conflict', {
            transactionId: existing.id,
            orderId: existing.orderId,
            actorRole: user.role,
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

    // Note: Partner stats (totalProfit, totalVolume) are only updated when transaction status changes to 'success'
    // This ensures partner targets are based on actual successful transactions
    // See PATCH handler in /api/transactions/[id]/route.ts for the stats update logic

    // Create notification for owner about new transaction
    // (Outside transaction — fail-after-commit, non-critical)
    try {
      const ownerProfile = await db.ownerProfile.findFirst();
      if (ownerProfile) {
        await db.notification.create({
          data: {
            type: 'new_order',
            title: 'Transaksi Baru',
            message: `${transaction.customer?.name || 'Customer'} - ${formatCurrency(toNumber(nominal))}`,
            data: JSON.stringify({
              orderId: transaction.orderId,
              customerName: transaction.customer?.name,
              nominal: toNumber(nominal),
              paymentFee: calc.paymentFee,
              paymentType: transaction.paymentType?.name,
              partnerName: transaction.partner?.name,
            }),
            targetType: 'owner',
            transactionId: transaction.id,
            partnerId: actualPartnerId,
          },
        });

        // Send Telegram notification if enabled
        const notifSettings = await db.notificationSettings.findUnique({
          where: { ownerProfileId: ownerProfile.id },
        });

        if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyNewTransaction) {
          // ── Telegram send (HTTP) — fail-after-commit pattern ──
          // DB transaction is already committed above. If Telegram fails, log a
          // warn and DO NOT roll back.
          try {
            await sendTelegramNotification(
              notifSettings.telegramBotToken,
              notifSettings.telegramChatId,
              {
                type: 'new_order',
                title: '💳 Transaksi Baru',
                message: `Order ID: ${transaction.orderId}`,
                additionalData: {
                  'Pelanggan': transaction.customer?.name,
                  'Nominal': formatCurrency(toNumber(nominal)),
                  'Fee': formatCurrency(calc.paymentFee),
                  'Tipe': transaction.paymentType?.name,
                  'Partner': transaction.partner?.name || '-',
                },
              }
            );
          } catch (telegramError) {
            logWarn({
              event: 'telegram.send_failed',
              errorCode: ErrorCode.TELEGRAM_SEND_FAILED,
              message: 'Telegram notification failed after successful transaction creation',
              orderId: transaction.orderId,
              transactionId: transaction.id,
              data: { orderId: transaction.orderId },
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
        orderId: transaction.orderId,
        transactionId: transaction.id,
        data: { orderId: transaction.orderId },
      });
    }

    logInfo({
      event: 'transaction.notification_complete',
      message: `Transaction ${transaction.orderId} created by ${user.role}`,
      orderId: transaction.orderId,
      transactionId: transaction.id,
    });

    return NextResponse.json({
      success: true,
      data: serializeTransaction(transaction as unknown as Record<string, unknown>),
      message: `Transaksi berhasil dibuat dengan status ${defaultStatus}`,
    });
  } catch (error) {
    logError({
      event: 'transaction.create_failed',
      errorCode: ErrorCode.TRANSACTION_CREATE_FAILED,
      data: { error },
    });
    return apiErrorFrom(error, ErrorCode.TRANSACTION_CREATE_FAILED, 'Gagal membuat transaksi');
  }
});
