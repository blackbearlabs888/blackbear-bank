import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { sendTelegramNotification, formatCurrency } from '@/lib/telegram';
import { calculateTransaction, CALCULATION_VERSION_PHASE2 } from '@/lib/transaction/fee';
import {
  applyStatusTransition,
  adjustVolumeForNominalChange,
  adjustStatsForPartnerChange,
  deleteTransactionWithStatsReversal,
} from '@/lib/transaction/stats';
import { isValidStatus, isSameStatus } from '@/lib/transaction/status-machine';
import { persistFraudAssessment, onStatusEnteringSuccess, snapshotFromTx } from '@/lib/fraud/service';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import {
  logWarn,
  logError,
  logTransactionEvent,
} from '@/lib/observability/logger';
import {
  apiErrorFrom,
  apiValidationError,
  apiUnauthenticated,
  apiForbidden,
  apiNotFound,
  ErrorCode,
} from '@/lib/observability/errors';
// Force recompile for transactionLink field

// Route context type for handlers with [id] dynamic param
type RouteContext = { params: Promise<{ id: string }> };

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
    fraudReviewedAt: tx.fraudReviewedAt ?? null,
    fraudReviewedBy: tx.fraudReviewedBy ?? null,
    fraudReviewNote: tx.fraudReviewNote ?? null,
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

// GET single transaction
export const GET = withObservability<RouteContext>(
  async (request: NextRequest, ctx: RouteContext) => {
    try {
      const user = await getCurrentUser();
      const { id } = await ctx.params;

      if (!user) {
        return apiUnauthenticated();
      }
      updateActor(user.role, user.id);

      const transaction = await db.transaction.findUnique({
        where: { id },
        include: {
          customer: true,
          paymentType: true,
          marketplace: true,
          partner: true,
        },
      });

      if (!transaction) {
        return apiNotFound('Transaksi tidak ditemukan');
      }

      // Authorization check for partners
      if (user.role === 'partner') {
        const partner = await db.partner.findUnique({
          where: { userId: user.id },
        });
        if (transaction.partnerId !== partner?.id) {
          return apiForbidden();
        }
      }

      return NextResponse.json({
        success: true,
        data: serializeTransaction(transaction as unknown as Record<string, unknown>),
      });
    } catch (error) {
      logError({
        event: 'transaction.get_failed',
        errorCode: ErrorCode.INTERNAL_ERROR,
        data: { error },
      });
      return apiErrorFrom(error, ErrorCode.INTERNAL_ERROR, 'Terjadi kesalahan server');
    }
  }
);

// PATCH update transaction
export const PATCH = withObservability<RouteContext>(
  async (request: NextRequest, ctx: RouteContext) => {
    try {
      const user = await getCurrentUser();
      const { id } = await ctx.params;

      if (!user) {
        return apiUnauthenticated();
      }
      updateActor(user.role, user.id);

      const body = await request.json();
      const { status, notes, marketplaceId, transactionLink, nominal, recalculate, sendNotification, partnerId, discountPercent, discountNominal, reevaluate } = body;

      // Get existing transaction
      const existingTransaction = await db.transaction.findUnique({
        where: { id },
        include: {
          paymentType: true,
          partner: true,
          marketplace: true,
        },
      });

      if (!existingTransaction) {
        return apiNotFound('Transaksi tidak ditemukan');
      }

      // Authorization: Owner can update anything, Partner can only update nominal on their own transactions
      // and only when status is pending or verification
      if (user.role === 'partner') {
        const partner = await db.partner.findUnique({
          where: { userId: user.id },
        });

        if (!partner || existingTransaction.partnerId !== partner.id) {
          return apiForbidden();
        }

        // Partner can only update nominal and only on pending/verification status
        const allowedStatuses = ['pending', 'verification'];
        if (!allowedStatuses.includes(existingTransaction.status)) {
          return apiForbidden();
        }

        // Partner can only change nominal, not status, notes, or other fields
        if (status !== undefined || notes !== undefined || marketplaceId !== undefined || transactionLink !== undefined) {
          return apiForbidden();
        }
      } else if (user.role !== 'owner') {
        return apiForbidden();
      }

      // ── Phase 2: Validate status early (centralized validator) ──
      if (status !== undefined) {
        if (typeof status !== 'string' || !isValidStatus(status.toLowerCase())) {
          return apiValidationError('Status tidak valid');
        }
      }

      // ── Discount status guard (preserve existing behavior) ──
      if (discountPercent !== undefined || discountNominal !== undefined) {
        const allowedDiscountStatuses = ['pending', 'verification'];
        if (!allowedDiscountStatuses.includes(existingTransaction.status)) {
          return apiValidationError('Diskon hanya dapat diterapkan saat status pending atau verifikasi');
        }
      }

      // ── Determine the effective partner for recomputation ──
      let effectivePartnerId: string | null = existingTransaction.partnerId;
      let partnerForCalc = existingTransaction.partner;
      if (partnerId !== undefined) {
        const newPid = partnerId === 'none' || partnerId === '' ? null : partnerId;
        if (newPid) {
          const partner = await db.partner.findUnique({ where: { id: newPid } });
          if (!partner || partner.status !== 'active') {
            return apiValidationError('Partner tidak valid atau tidak aktif');
          }
          effectivePartnerId = newPid;
          partnerForCalc = partner;
        } else {
          effectivePartnerId = null;
          partnerForCalc = null;
        }
      }

      // ── Determine the effective marketplace for recomputation ──
      let effectiveMarketplaceId: string | null = existingTransaction.marketplaceId;
      let marketplaceForCalc = existingTransaction.marketplace;
      if (marketplaceId !== undefined || body.clearMarketplace) {
        const newMid = marketplaceId === 'none' || marketplaceId === '' ? null : marketplaceId;
        if (newMid) {
          const marketplace = await db.marketplace.findUnique({ where: { id: newMid } });
          if (marketplace) {
            effectiveMarketplaceId = newMid;
            marketplaceForCalc = marketplace;
          }
        } else {
          effectiveMarketplaceId = null;
          marketplaceForCalc = null;
        }
      }

      // ── Determine the effective nominal for recomputation ──
      const oldNominal = toNumber(existingTransaction.nominal);
      const newNominal = nominal !== undefined ? Number(nominal) : oldNominal;
      const shouldRecalc = (nominal !== undefined || recalculate || marketplaceId !== undefined || body.clearMarketplace || discountPercent !== undefined || discountNominal !== undefined);

      // ── Consolidated fee recalculation (if any input changed) ──
      let calc: ReturnType<typeof calculateTransaction> | null = null;
      if (shouldRecalc && existingTransaction.paymentType) {
        if (isNaN(newNominal) || newNominal <= 0) {
          return apiValidationError('Nominal tidak valid');
        }
        calc = calculateTransaction({
          nominal: newNominal,
          paymentType: existingTransaction.paymentType as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
          marketplace: marketplaceForCalc ? { name: marketplaceForCalc.name, feePercent: marketplaceForCalc.feePercent, feeFlat: marketplaceForCalc.feeFlat } : null,
          partner: partnerForCalc ? { commission: partnerForCalc.commission } : null,
          methodTransaction: existingTransaction.methodTransaction,
          discountPercentOverride: discountPercent !== undefined ? Number(discountPercent) : undefined,
          discountNominalOverride: discountNominal !== undefined ? Number(discountNominal) : undefined,
        });
      }

      // ── Execute all mutations atomically in a single $transaction ──
      const { transaction, statusChanged } = await db.$transaction(async (tx) => {
        // ── Status transition with atomic stats mutation ──
        let statusChangedFlag = false;
        let txAfterStatus = existingTransaction;
        if (status !== undefined) {
          const normalizedStatus = status.toLowerCase();
          const result = await applyStatusTransition(
            tx,
            {
              id: existingTransaction.id,
              status: existingTransaction.status,
              partnerId: existingTransaction.partnerId,
              customerId: existingTransaction.customerId,
              nominal: existingTransaction.nominal,
              partnerProfit: existingTransaction.partnerProfit,
              // Phase 5: pass fraud/commission snapshot so the commission lifecycle
              // can decide whether to increment partner stats.
              fraudStatus: existingTransaction.fraudStatus,
              commissionStatus: existingTransaction.commissionStatus,
              commissionApprovedAmount: existingTransaction.commissionApprovedAmount,
            },
            normalizedStatus,
          );
          txAfterStatus = result.transaction as typeof existingTransaction;
          statusChangedFlag = result.statusChanged;
        }

        // ── Build the update payload for all other fields ──
        const updateData: Record<string, unknown> = {};

        if (notes !== undefined) {
          updateData.notes = notes || null;
        }
        if (transactionLink !== undefined) {
          updateData.transactionLink = transactionLink || null;
        }

        // ── Partner change ──
        if (partnerId !== undefined) {
          updateData.partnerId = effectivePartnerId;
        }

        // ── Apply consolidated fee calculation results ──
        if (calc) {
          updateData.nominal = calc.nominal;
          updateData.paymentFee = calc.paymentFee;
          updateData.originalFee = calc.originalFee;
          updateData.discountPercent = calc.discountPercent;
          updateData.discountAmount = calc.discountAmount;
          updateData.platformFee = calc.platformFee;
          updateData.netMargin = calc.netMargin;
          updateData.partnerProfit = calc.partnerProfit;
          updateData.ownerProfit = calc.ownerProfit;
          updateData.totalReceived = calc.totalReceived;
          // Update snapshot fields
          updateData.partnerCommissionPercent = calc.partnerCommissionPercent;
          updateData.paymentTypeName = calc.paymentTypeName;
          updateData.marketplaceName = calc.marketplaceName;
          updateData.feeConfigSnapshot = calc.feeConfigSnapshot;
          updateData.calculationVersion = CALCULATION_VERSION_PHASE2;
          if (marketplaceId !== undefined || body.clearMarketplace) {
            updateData.marketplaceId = effectiveMarketplaceId;
          }
        }

        // ── Apply the update (if there's anything to update) ──
        let finalTransaction = txAfterStatus;
        if (Object.keys(updateData).length > 0) {
          finalTransaction = await tx.transaction.update({
            where: { id },
            data: updateData,
            include: {
              customer: true,
              paymentType: true,
              marketplace: true,
              partner: true,
            },
          });
        }

        // ── Adjust customer/partner volume for nominal change ──
        if (calc && nominal !== undefined && newNominal !== oldNominal) {
          await adjustVolumeForNominalChange(
            tx,
            {
              id: existingTransaction.id,
              status: existingTransaction.status,
              partnerId: existingTransaction.partnerId,
              customerId: existingTransaction.customerId,
              nominal: existingTransaction.nominal,
              partnerProfit: existingTransaction.partnerProfit,
              fraudStatus: existingTransaction.fraudStatus,
              commissionStatus: existingTransaction.commissionStatus,
              commissionApprovedAmount: existingTransaction.commissionApprovedAmount,
            },
            oldNominal,
            newNominal,
          );
        }

        // ── Adjust partner stats for partner change ──
        if (partnerId !== undefined && calc) {
          await adjustStatsForPartnerChange(
            tx,
            {
              id: existingTransaction.id,
              status: existingTransaction.status,
              partnerId: existingTransaction.partnerId,
              customerId: existingTransaction.customerId,
              nominal: existingTransaction.nominal,
              partnerProfit: existingTransaction.partnerProfit,
              fraudStatus: existingTransaction.fraudStatus,
              commissionStatus: existingTransaction.commissionStatus,
              commissionApprovedAmount: existingTransaction.commissionApprovedAmount,
            },
            effectivePartnerId,
            calc.partnerProfit,
          );
        }

        // ── Phase 5: Re-run fraud assessment when partner changes or owner re-evaluates ──
        // This sets the commission state for the (potentially new) partner. If the
        // transaction is already in 'success' status and the new commission is
        // 'pending' (fraud clear), we call onStatusEnteringSuccess to approve +
        // increment the new partner's stats.
        const partnerChanged = partnerId !== undefined && effectivePartnerId !== existingTransaction.partnerId;
        if (partnerChanged || reevaluate) {
          // Fetch the current state of the transaction (post-status + post-field updates)
          const currentTx = await tx.transaction.findUniqueOrThrow({
            where: { id },
            select: {
              id: true,
              status: true,
              partnerId: true,
              customerId: true,
              nominal: true,
              partnerProfit: true,
              fraudStatus: true,
              commissionStatus: true,
              commissionApprovedAmount: true,
            },
          });

          // Run fraud assessment (updates fraud + commission fields, appends event)
          await persistFraudAssessment(
            tx,
            {
              transactionId: id,
              orderId: existingTransaction.orderId,
              partnerId: currentTx.partnerId,
              customerId: currentTx.customerId,
              transactionCreatedAt: existingTransaction.createdAt,
            },
            {
              actorType: 'owner',
              actorId: user.id,
              note: reevaluate ? 'Owner manual re-evaluate' : 'Partner reassignment',
            },
          );

          // Re-fetch to get the updated commission state
          const afterAssessment = await tx.transaction.findUniqueOrThrow({
            where: { id },
            select: {
              status: true,
              partnerId: true,
              customerId: true,
              nominal: true,
              partnerProfit: true,
              fraudStatus: true,
              commissionStatus: true,
              commissionApprovedAmount: true,
            },
          });

          // If the transaction is in 'success' status, ensure the new partner's
          // stats are incremented if commission is now 'pending' (fraud clear).
          // onStatusEnteringSuccess is idempotent — if commission is already
          // 'approved', it no-ops. If 'held', it no-ops.
          if (afterAssessment.status === 'success' && afterAssessment.partnerId) {
            await onStatusEnteringSuccess(tx, snapshotFromTx({
              ...afterAssessment,
              id,
            } as never));
          }

          // Refresh the returned transaction to include fraud fields
          finalTransaction = await tx.transaction.findUniqueOrThrow({
            where: { id },
            include: {
              customer: true,
              paymentType: true,
              marketplace: true,
              partner: true,
            },
          });
        }

        return { transaction: finalTransaction, statusChanged: statusChangedFlag };
      });

      // ── Phase 3 observability: emit events AFTER $transaction commits ──
      // Status transition events
      if (status !== undefined) {
        const normalizedStatus = status.toLowerCase();
        if (statusChanged) {
          // Status actually changed (oldStatus !== newStatus, conditional updateMany affected 1 row)
          logTransactionEvent('transaction.status_changed', {
            transactionId: id,
            orderId: existingTransaction.orderId,
            actorRole: user.role,
            extra: {
              oldStatus: existingTransaction.status,
              newStatus: normalizedStatus,
            },
          });
        } else if (isSameStatus(existingTransaction.status, normalizedStatus)) {
          // Same-status request — no-op
          logTransactionEvent('transaction.status_noop', {
            transactionId: id,
            orderId: existingTransaction.orderId,
            actorRole: user.role,
            message: 'Same status requested — no-op',
            extra: { status: existingTransaction.status },
          });
        } else {
          // statusChanged === false but status differs → concurrent modification
          // (the conditional updateMany where: { id, status: oldStatus } matched 0 rows
          // because another request already changed the status)
          logTransactionEvent('transaction.atomic_conflict', {
            transactionId: id,
            orderId: existingTransaction.orderId,
            actorRole: user.role,
            errorCode: 'ATOMIC_CONFLICT',
            message: 'Status transition skipped — concurrent modification detected',
            extra: {
              expectedOldStatus: existingTransaction.status,
              attemptedNewStatus: normalizedStatus,
            },
          });
        }
      }

      // Nominal change event
      if (nominal !== undefined && newNominal !== oldNominal) {
        logTransactionEvent('transaction.amount_changed', {
          transactionId: id,
          orderId: existingTransaction.orderId,
          actorRole: user.role,
          monetary: {
            oldNominal,
            newNominal,
            paymentFee: calc?.paymentFee,
            partnerProfit: calc?.partnerProfit,
            ownerProfit: calc?.ownerProfit,
          },
        });
      }

      // Marketplace change event
      const marketplaceChangeRequested = marketplaceId !== undefined || body.clearMarketplace;
      const marketplaceActuallyChanged =
        marketplaceChangeRequested && effectiveMarketplaceId !== existingTransaction.marketplaceId;
      if (marketplaceActuallyChanged) {
        logTransactionEvent('transaction.marketplace_changed', {
          transactionId: id,
          orderId: existingTransaction.orderId,
          actorRole: user.role,
          extra: {
            oldMarketplaceId: existingTransaction.marketplaceId,
            newMarketplaceId: effectiveMarketplaceId,
          },
        });
      }

      // ── Notifications (outside transaction — non-critical, fail-after-commit) ──
      if (statusChanged && status) {
        try {
          const ownerProfile = await db.ownerProfile.findFirst();
          if (ownerProfile) {
            await db.notification.create({
              data: {
                type: 'transaction_update',
                title: 'Update Status Transaksi',
                message: `${transaction.orderId} - ${transaction.customer?.name || 'Customer'} - Status: ${status.toUpperCase()}`,
                data: JSON.stringify({
                  orderId: transaction.orderId,
                  customerName: transaction.customer?.name,
                  nominal: toNumber(transaction.nominal),
                  oldStatus: existingTransaction.status,
                  newStatus: status,
                }),
                targetType: 'owner',
                transactionId: transaction.id,
                partnerId: transaction.partnerId,
              },
            });

            const notifSettings = await db.notificationSettings.findUnique({
              where: { ownerProfileId: ownerProfile.id },
            });

            if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyTransactionStatus) {
              const statusEmoji: Record<string, string> = {
                pending: '⏳',
                verification: '🔍',
                process: '⚙️',
                success: '✅',
                failed: '❌',
              };
              try {
                await sendTelegramNotification(
                  notifSettings.telegramBotToken,
                  notifSettings.telegramChatId,
                  {
                    type: 'transaction_update',
                    title: `${statusEmoji[status] || '📝'} Update Transaksi`,
                    message: `Order ID: ${transaction.orderId}`,
                    additionalData: {
                      'Pelanggan': transaction.customer?.name,
                      'Nominal': formatCurrency(toNumber(transaction.nominal)),
                      'Status': status.toUpperCase(),
                      'Catatan': notes || '-',
                    },
                  }
                );
              } catch (telegramError) {
                logWarn({
                  event: 'telegram.send_failed',
                  errorCode: ErrorCode.TELEGRAM_SEND_FAILED,
                  message: 'Telegram notification failed after successful transaction update',
                  orderId: transaction.orderId,
                  transactionId: transaction.id,
                  data: { orderId: transaction.orderId },
                });
              }
            }
          }
        } catch (notifError) {
          logWarn({
            event: 'notification.create_failed',
            errorCode: ErrorCode.INTERNAL_ERROR,
            message: 'Failed to create in-app notification record',
            orderId: transaction.orderId,
            transactionId: transaction.id,
            data: { orderId: transaction.orderId },
          });
        }
      }

      if (sendNotification && nominal !== undefined && nominal !== toNumber(existingTransaction.nominal)) {
        try {
          const ownerProfile = await db.ownerProfile.findFirst();
          if (ownerProfile) {
            await db.notification.create({
              data: {
                type: 'transaction_update',
                title: 'Update Nominal Transaksi',
                message: `${transaction.orderId} - ${transaction.customer?.name || 'Customer'} - Nominal diubah oleh Partner`,
                data: JSON.stringify({
                  orderId: transaction.orderId,
                  customerName: transaction.customer?.name,
                  oldNominal: toNumber(existingTransaction.nominal),
                  newNominal: toNumber(transaction.nominal),
                  partnerName: transaction.partner?.name,
                }),
                targetType: 'owner',
                transactionId: transaction.id,
                partnerId: transaction.partnerId,
              },
            });

            const notifSettings = await db.notificationSettings.findUnique({
              where: { ownerProfileId: ownerProfile.id },
            });

            if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyTransactionStatus) {
              try {
                await sendTelegramNotification(
                  notifSettings.telegramBotToken,
                  notifSettings.telegramChatId,
                  {
                    type: 'transaction_update',
                    title: '📝 Update Nominal',
                    message: `Order ID: ${transaction.orderId}`,
                    additionalData: {
                      'Pelanggan': transaction.customer?.name,
                      'Nominal Lama': formatCurrency(toNumber(existingTransaction.nominal)),
                      'Nominal Baru': formatCurrency(toNumber(transaction.nominal)),
                      'Partner': transaction.partner?.name || '-',
                    },
                  }
                );
              } catch (telegramError) {
                logWarn({
                  event: 'telegram.send_failed',
                  errorCode: ErrorCode.TELEGRAM_SEND_FAILED,
                  message: 'Telegram notification failed after successful nominal update',
                  orderId: transaction.orderId,
                  transactionId: transaction.id,
                  data: { orderId: transaction.orderId },
                });
              }
            }
          }
        } catch (notifError) {
          logWarn({
            event: 'notification.create_failed',
            errorCode: ErrorCode.INTERNAL_ERROR,
            message: 'Failed to create in-app notification record',
            orderId: transaction.orderId,
            transactionId: transaction.id,
            data: { orderId: transaction.orderId },
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: serializeTransaction(transaction as unknown as Record<string, unknown>),
        message: 'Transaksi berhasil diupdate',
      });
    } catch (error) {
      logError({
        event: 'transaction.update_failed',
        errorCode: ErrorCode.TRANSACTION_UPDATE_FAILED,
        data: { error },
      });
      return apiErrorFrom(error, ErrorCode.TRANSACTION_UPDATE_FAILED, 'Gagal mengupdate transaksi');
    }
  }
);

// DELETE transaction
export const DELETE = withObservability<RouteContext>(
  async (request: NextRequest, ctx: RouteContext) => {
    try {
      const user = await getCurrentUser();
      const { id } = await ctx.params;

      if (!user) {
        return apiUnauthenticated();
      }
      updateActor(user.role, user.id);

      // Only owner can delete transactions
      if (user.role !== 'owner') {
        return apiForbidden();
      }

      // Get existing transaction
      const existingTransaction = await db.transaction.findUnique({
        where: { id },
      });

      if (!existingTransaction) {
        return apiNotFound('Transaksi tidak ditemukan');
      }

      // Capture monetary summary BEFORE delete (for observability event)
      const deletedMonetary = {
        nominal: toNumber(existingTransaction.nominal),
        partnerProfit: toNumber(existingTransaction.partnerProfit),
      };
      const deletedOrderId = existingTransaction.orderId;
      const deletedStatus = existingTransaction.status;
      const deletedPartnerId = existingTransaction.partnerId;
      const deletedCustomerId = existingTransaction.customerId;

      // ── Phase 2: Delete with atomic stats reversal ──
      // Customer stats always reversed; partner stats reversed only if was
      // success AND commission was approved (Phase 5).
      // All writes inside a single $transaction. Idempotency key + fraud events
      // (cascade) are removed with the row (hard delete — per correction,
      // replay-after-delete is out of scope).
      await deleteTransactionWithStatsReversal({
        id: existingTransaction.id,
        status: existingTransaction.status,
        partnerId: existingTransaction.partnerId,
        customerId: existingTransaction.customerId,
        nominal: existingTransaction.nominal,
        partnerProfit: existingTransaction.partnerProfit,
        fraudStatus: existingTransaction.fraudStatus,
        commissionStatus: existingTransaction.commissionStatus,
        commissionApprovedAmount: existingTransaction.commissionApprovedAmount,
      });

      // ── Phase 3 observability: emit transaction.deleted AFTER commit ──
      logTransactionEvent('transaction.deleted', {
        transactionId: id,
        orderId: deletedOrderId,
        actorRole: user.role,
        monetary: deletedMonetary,
        extra: {
          status: deletedStatus,
          partnerId: deletedPartnerId,
          customerId: deletedCustomerId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Transaksi berhasil dihapus',
      });
    } catch (error) {
      logError({
        event: 'transaction.delete_failed',
        errorCode: ErrorCode.TRANSACTION_DELETE_FAILED,
        data: { error },
      });
      return apiErrorFrom(error, ErrorCode.TRANSACTION_DELETE_FAILED, 'Gagal menghapus transaksi');
    }
  }
);
