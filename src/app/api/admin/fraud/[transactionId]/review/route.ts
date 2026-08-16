import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import { logError, logInfo } from '@/lib/observability/logger';
import {
  apiErrorFrom,
  apiUnauthenticated,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  ErrorCode,
} from '@/lib/observability/errors';
import { applyOwnerReviewAction } from '@/lib/fraud/service';

type RouteContext = { params: Promise<{ transactionId: string }> };

/**
 * POST /api/admin/fraud/[transactionId]/review
 *
 * Owner-only. Apply a fraud review action to a transaction.
 *
 * Body:
 *   { action: "approve" | "reject" | "suspend", note?: string }
 *
 * Behavior (per directive section 8):
 *   - approve: fraudStatus → dismissed, commissionStatus → approved,
 *              commissionApprovedAmount → partnerProfit,
 *              partner stats increment once (if status is success).
 *   - reject:  fraudStatus → confirmed, commissionStatus → rejected,
 *              commissionApprovedAmount → 0,
 *              partner stats reversed once (if was approved).
 *   - suspend: partner status → suspended, commission stays held.
 *
 * All writes are atomic in a single $transaction. Idempotent — repeated
 * requests do not double-mutate stats.
 */
export const POST = withObservability<RouteContext>(
  async (request: NextRequest, ctx: RouteContext) => {
    try {
      const user = await getCurrentUser();
      if (!user) return apiUnauthenticated();
      updateActor(user.role, user.id);

      if (user.role !== 'owner') return apiForbidden();

      const { transactionId } = await ctx.params;
      const body = await request.json();
      const { action, note } = body as { action?: string; note?: string };

      // Validate action
      if (!action || !['approve', 'reject', 'suspend'].includes(action)) {
        return apiValidationError('Action harus salah satu dari: approve, reject, suspend');
      }

      // Validate note length if provided
      if (note !== undefined && note !== null && typeof note !== 'string') {
        return apiValidationError('Note harus berupa string');
      }
      if (note && note.length > 1000) {
        return apiValidationError('Note terlalu panjang (maks 1000 karakter)');
      }

      // Check transaction exists
      const existing = await db.transaction.findUnique({
        where: { id: transactionId },
        select: { id: true, orderId: true, partnerId: true },
      });
      if (!existing) {
        return apiNotFound('Transaksi tidak ditemukan');
      }

      // Apply the review action atomically
      const result = await db.$transaction(async (tx) => {
        // Set review metadata
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            fraudReviewedAt: new Date(),
            fraudReviewedBy: user.id,
            fraudReviewNote: note ?? null,
          },
        });

        return applyOwnerReviewAction(tx, transactionId, action as 'approve' | 'reject' | 'suspend', note, user.id);
      });

      logInfo({
        event: 'fraud.review_action_completed',
        transactionId,
        orderId: existing.orderId,
        actorId: user.id,
        message: `Owner review action completed: ${action}`,
        data: {
          action,
          newFraudStatus: result.newFraudStatus,
          newCommissionStatus: result.newCommissionStatus,
          statsDelta: result.statsDelta,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          transactionId,
          action,
          newFraudStatus: result.newFraudStatus,
          newCommissionStatus: result.newCommissionStatus,
          statsDelta: result.statsDelta,
        },
        message: `Aksi ${action} berhasil diterapkan`,
      });
    } catch (error) {
      logError({
        event: 'fraud.review_action_failed',
        errorCode: ErrorCode.INTERNAL_ERROR,
        data: { error },
      });
      return apiErrorFrom(error, ErrorCode.INTERNAL_ERROR, 'Gagal menerapkan aksi review');
    }
  },
);
