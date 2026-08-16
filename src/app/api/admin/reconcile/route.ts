/**
 * Phase 3 — Partner Stats Reconciliation (Owner-Only API)
 *
 * GET /api/admin/reconcile
 *
 * Returns a read-only comparison of each Partner's stored denormalized
 * counters vs recomputed values from successful transactions.
 *
 * Access control: OWNER ONLY. Partners and the public receive 403.
 *
 * This endpoint NEVER writes to the database. It only reads.
 *
 * @module api/admin/reconcile
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reconcilePartners } from '@/lib/observability/reconcile';
import { getRequestId, setRequestIdHeader, withObservability } from '@/lib/observability/request-id';
import { apiForbidden, apiUnauthenticated, apiErrorFrom } from '@/lib/observability/errors';
import { logInfo, logWarn } from '@/lib/observability/logger';
import { ErrorCode } from '@/lib/observability/errors';

export const GET = withObservability(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }
    if (user.role !== 'owner') {
      logWarn({
        event: 'reconcile.forbidden',
        actorRole: user.role,
        actorId: user.id,
        message: 'Non-owner attempted to access reconciliation endpoint',
      });
      return apiForbidden();
    }

    // Run the read-only reconciliation
    const result = await reconcilePartners();

    logInfo({
      event: 'reconcile.completed',
      actorRole: 'owner',
      actorId: user.id,
      message: `Reconciliation complete: ${result.matched} MATCH, ${result.drifted} DRIFT`,
      data: {
        total: result.total,
        matched: result.matched,
        drifted: result.drifted,
      },
    });

    const response = NextResponse.json({ success: true, data: result });
    setRequestIdHeader(response, getRequestId(request));
    return response;
  } catch (error) {
    logWarn({
      event: 'reconcile.failed',
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: 'Reconciliation query failed',
      data: { error },
    });
    return apiErrorFrom(error, ErrorCode.INTERNAL_ERROR, 'Terjadi kesalahan server');
  }
});
