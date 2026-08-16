import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import { logError } from '@/lib/observability/logger';
import {
  apiErrorFrom,
  apiUnauthenticated,
  apiForbidden,
  apiValidationError,
  ErrorCode,
} from '@/lib/observability/errors';
import { maskPhone, maskBankAccount, maskName } from '@/lib/fraud/identity';
import { describeReason } from '@/lib/fraud/engine';

/**
 * GET /api/admin/fraud
 *
 * Owner-only. Returns a paginated list of transactions flagged for fraud
 * review, with masked PII (phone, bank account, name).
 *
 * Query params:
 *   - status: 'review' | 'confirmed' | 'dismissed' | 'all' (default: 'review')
 *   - page: number (default 1)
 *   - limit: number (default 20, max 50)
 *
 * Response shape:
 *   {
 *     success: true,
 *     data: [{
 *       transactionId, orderId, riskScore, riskLevel, fraudStatus,
 *       commissionStatus, commissionApprovedAmount, partnerProfit,
 *       reasonCodes: [{ code, description }],
 *       partner: { id, name(masked), status } | null,
 *       customer: { name(masked), phone(masked), bankAccount(masked) },
 *       createdAt, reviewedAt, reviewNote
 *     }],
 *     pagination: { currentPage, totalPages, totalItems, itemsPerPage }
 *   }
 */
export const GET = withObservability(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthenticated();
    updateActor(user.role, user.id);

    if (user.role !== 'owner') return apiForbidden();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'review';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (statusFilter !== 'all') {
      where.fraudStatus = statusFilter;
    } else {
      // 'all' → only show transactions that have a partner (fraud is relevant)
      where.partnerId = { not: null };
      where.fraudStatus = { in: ['review', 'confirmed', 'dismissed'] };
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              bankAccount: true,
              city: true,
            },
          },
          partner: {
            select: {
              id: true,
              name: true,
              status: true,
              city: true,
            },
          },
          paymentType: { select: { name: true } },
        },
        orderBy: { fraudRiskScore: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.transaction.count({ where }),
    ]);

    const data = transactions.map((tx) => {
      let reasonCodes: Array<{ code: string; description: string }> = [];
      try {
        const parsed = tx.fraudReasons ? JSON.parse(tx.fraudReasons) : [];
        if (Array.isArray(parsed)) {
          reasonCodes = parsed.map((r: { code?: string }) => ({
            code: r.code ?? 'unknown',
            description: describeReason(r.code ?? 'unknown'),
          }));
        }
      } catch {
        reasonCodes = [];
      }

      return {
        transactionId: tx.id,
        orderId: tx.orderId,
        nominal: toNumber(tx.nominal),
        partnerProfit: toNumber(tx.partnerProfit),
        riskScore: tx.fraudRiskScore,
        riskLevel: tx.fraudRiskLevel,
        fraudStatus: tx.fraudStatus,
        commissionStatus: tx.commissionStatus,
        commissionApprovedAmount: toNumber(tx.commissionApprovedAmount),
        status: tx.status,
        reasonCodes,
        partner: tx.partner
          ? {
              id: tx.partner.id,
              name: maskName(tx.partner.name),
              status: tx.partner.status,
              city: tx.partner.city,
            }
          : null,
        customer: {
          name: maskName(tx.customer.name),
          phone: maskPhone(tx.customer.phone),
          bankAccount: maskBankAccount(tx.customer.bankAccount),
          city: tx.customer.city,
        },
        paymentType: tx.paymentType?.name ?? null,
        createdAt: tx.createdAt,
        reviewedAt: tx.fraudReviewedAt,
        reviewNote: tx.fraudReviewNote,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    logError({
      event: 'fraud.list_failed',
      errorCode: ErrorCode.INTERNAL_ERROR,
      data: { error },
    });
    return apiErrorFrom(error, ErrorCode.INTERNAL_ERROR, 'Terjadi kesalahan server');
  }
});
