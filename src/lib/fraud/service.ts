/**
 * Phase 5 — Fraud Service Orchestration
 *
 * Combines the fraud engine, commission lifecycle, and DB queries into a
 * single entry point used by route handlers. Handles:
 *   - Identity lookup (partner + customer historical records)
 *   - Fraud assessment
 *   - Atomic transaction update + FraudReviewEvent insert + partner suspension
 *   - Structured logging (no PII)
 *
 * All public functions take a Prisma transaction client so they can be
 * composed inside the caller's `db.$transaction(async (tx) => ...)`.
 *
 * @module fraud/service
 */

import { db, toNumber } from '@/lib/db';
import { logInfo, logWarn } from '@/lib/observability/logger';
import {
  assessFraud,
  type FraudAssessmentInput,
  type FraudAssessmentResult,
  type FraudReason,
} from './engine';
import {
  coerceCommissionStatus,
  coerceFraudStatus,
  onStatusEnteringSuccess,
  onStatusLeavingSuccess,
  ownerApprove,
  ownerReject,
  suspendPartner,
  adjustCommissionForPartnerChange,
  type CommissionTxSnapshot,
} from './commission';

// ── Types ──

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export interface FraudAssessmentContext {
  transactionId?: string;
  orderId?: string;
  partnerId: string | null;
  customerId: string;
  /** Customer identity from the order/transaction body */
  customer: {
    phone: string;
    bankAccount?: string | null;
    bankHolder?: string | null;
    name: string;
    city?: string | null;
    createdAt?: Date;
  } | null;
  /** Transaction creation time (defaults to now) */
  transactionCreatedAt?: Date;
}

// ── Identity lookup ──

/**
 * Gather the inputs needed for a fraud assessment.
 *
 * Queries:
 *   - Partner row (phone, bankAccount, bankHolder, name, city, joinedAt)
 *   - Customer row (phone, bankAccount, bankHolder, name, city, createdAt)
 *   - Existing transactions linked to the partner (for REPEATED_SAME_BENEFICIARY)
 *
 * Returns null if partnerId is null (no partner → no fraud check).
 */
export async function buildAssessmentInput(
  tx: TxClient | typeof db,
  ctx: FraudAssessmentContext,
): Promise<FraudAssessmentInput | null> {
  if (!ctx.partnerId) return null;

  const partner = await tx.partner.findUnique({
    where: { id: ctx.partnerId },
    select: {
      id: true,
      phone: true,
      bankAccount: true,
      bankHolder: true,
      name: true,
      city: true,
      joinedAt: true,
    },
  });
  if (!partner) return null;

  // Customer: prefer caller-provided identity (order body), fall back to DB row.
  let customerRow: {
    phone: string;
    bankAccount: string | null;
    bankHolder: string | null;
    name: string;
    city: string | null;
    createdAt: Date;
  } | null = null;
  if (ctx.customer) {
    customerRow = {
      phone: ctx.customer.phone,
      bankAccount: ctx.customer.bankAccount ?? null,
      bankHolder: ctx.customer.bankHolder ?? null,
      name: ctx.customer.name,
      city: ctx.customer.city ?? null,
      createdAt: ctx.customer.createdAt ?? new Date(),
    };
  } else {
    const dbCustomer = await tx.customer.findUnique({
      where: { id: ctx.customerId },
      select: {
        phone: true,
        bankAccount: true,
        bankHolder: true,
        name: true,
        city: true,
        createdAt: true,
      },
    });
    if (dbCustomer) customerRow = dbCustomer;
  }
  if (!customerRow) return null;

  // Existing transactions for this partner (for REPEATED_SAME_BENEFICIARY).
  // Limit to last 50 partner transactions for performance.
  const existingTransactions = await tx.transaction.findMany({
    where: { partnerId: ctx.partnerId },
    select: {
      partnerId: true,
      customerId: true,
      createdAt: true,
      customer: { select: { bankAccount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const mapped = existingTransactions.map((t) => ({
    partnerId: t.partnerId ?? '',
    customerId: t.customerId,
    bankAccount: t.customer?.bankAccount ?? null,
    createdAt: t.createdAt,
  }));

  return {
    partner: {
      id: partner.id,
      phone: partner.phone,
      bankAccount: partner.bankAccount,
      bankHolder: partner.bankHolder,
      name: partner.name,
      city: partner.city,
      joinedAt: partner.joinedAt,
    },
    customer: {
      phone: customerRow.phone,
      bankAccount: customerRow.bankAccount,
      bankHolder: customerRow.bankHolder,
      name: customerRow.name,
      city: customerRow.city,
      createdAt: customerRow.createdAt,
    },
    existingTransactions: mapped,
    transactionCreatedAt: ctx.transactionCreatedAt ?? new Date(),
  };
}

// ── Atomic assessment + persist ──

/**
 * Run fraud assessment and persist the result on the transaction row, plus
 * append a FraudReviewEvent.
 *
 * MUST be called inside a `db.$transaction`. The caller is responsible for
 * composing this with other writes (commission state, partner suspension,
 * stats mutations).
 *
 * If `shouldSuspendPartner` is true, suspends the partner atomically.
 *
 * @returns The assessment result. Returns null if no partner was found.
 */
export async function persistFraudAssessment(
  tx: TxClient,
  ctx: FraudAssessmentContext,
  opts?: { actorType?: 'system' | 'owner'; actorId?: string | null; note?: string },
): Promise<FraudAssessmentResult | null> {
  const input = await buildAssessmentInput(tx, ctx);
  if (!input) return null;

  const result = assessFraud(input);

  // Persist assessment fields on the transaction
  await tx.transaction.update({
    where: ctx.transactionId ? { id: ctx.transactionId } : { customerId: ctx.customerId },
    data: {
      fraudRiskScore: result.score,
      fraudRiskLevel: result.level,
      fraudStatus: result.status,
      fraudReasons: JSON.stringify(result.reasons),
      commissionStatus: result.commissionStatus,
    },
  });

  // Append FraudReviewEvent (append-only)
  await tx.fraudReviewEvent.create({
    data: {
      transactionId: ctx.transactionId ?? '',
      partnerId: ctx.partnerId,
      action: 'assess',
      previousStatus: null,
      newStatus: result.status,
      riskScore: result.score,
      reasons: JSON.stringify(result.reasons),
      actorType: opts?.actorType ?? 'system',
      actorId: opts?.actorId ?? null,
      note: opts?.note ?? null,
    },
  });

  // Auto-suspend partner if required
  if (result.shouldSuspendPartner && ctx.partnerId) {
    await suspendPartner(tx, ctx.partnerId);
  }

  // Structured logging — NO PII
  logInfo({
    event: 'fraud.assessment_completed',
    transactionId: ctx.transactionId ?? null,
    orderId: ctx.orderId ?? null,
    message: `Fraud assessment: score=${result.score} level=${result.level} status=${result.status}`,
    data: {
      score: result.score,
      level: result.level,
      status: result.status,
      commissionStatus: result.commissionStatus,
      shouldSuspendPartner: result.shouldSuspendPartner,
      reasonCodes: result.reasons.map((r: FraudReason) => r.code),
    },
  });

  if (result.status === 'review') {
    logWarn({
      event: 'fraud.review_required',
      transactionId: ctx.transactionId ?? null,
      orderId: ctx.orderId ?? null,
      message: 'Transaction flagged for manual fraud review',
      data: {
        score: result.score,
        level: result.level,
        reasonCodes: result.reasons.map((r: FraudReason) => r.code),
      },
    });
  }

  if (result.shouldSuspendPartner) {
    logWarn({
      event: 'fraud.partner_suspended',
      transactionId: ctx.transactionId ?? null,
      orderId: ctx.orderId ?? null,
      message: 'Partner auto-suspended due to critical fraud signal',
      data: {
        score: result.score,
        level: result.level,
        reasonCodes: result.reasons.map((r: FraudReason) => r.code),
      },
    });
  }

  if (result.commissionStatus === 'held') {
    logInfo({
      event: 'fraud.commission_held',
      transactionId: ctx.transactionId ?? null,
      orderId: ctx.orderId ?? null,
      message: 'Commission held pending fraud review',
      data: {
        score: result.score,
        level: result.level,
      },
    });
  }

  return result;
}

// ── Snapshot helper ──

/**
 * Build a CommissionTxSnapshot from a DB transaction row.
 *
 * Used by route handlers to pass the pre-mutation state into the commission
 * lifecycle functions.
 */
export function snapshotFromTx(tx: {
  id: string;
  status: string;
  partnerId: string | null;
  customerId: string;
  nominal: unknown;
  partnerProfit: unknown;
  fraudStatus: string;
  commissionStatus: string;
  commissionApprovedAmount: unknown;
}): CommissionTxSnapshot {
  return {
    id: tx.id,
    status: tx.status,
    partnerId: tx.partnerId,
    customerId: tx.customerId,
    nominal: tx.nominal,
    partnerProfit: tx.partnerProfit,
    fraudStatus: tx.fraudStatus,
    commissionStatus: tx.commissionStatus,
    commissionApprovedAmount: tx.commissionApprovedAmount,
  };
}

// ── Owner review action wrapper ──

/**
 * Apply an owner review action (approve/reject/suspend) atomically.
 *
 * MUST be called inside a `db.$transaction`.
 *
 * Behavior:
 *   - approve → onStatusLeavingSuccess no-op + ownerApprove + FraudReviewEvent
 *   - reject  → ownerReject + FraudReviewEvent
 *   - suspend → suspendPartner + FraudReviewEvent (commission stays held)
 *
 * Idempotent: repeated requests do not double-mutate stats.
 *
 * @returns The action descriptor for logging/response.
 */
export async function applyOwnerReviewAction(
  tx: TxClient,
  transactionId: string,
  action: 'approve' | 'reject' | 'suspend',
  note: string | undefined,
  actorId: string,
): Promise<{
  newFraudStatus: string;
  newCommissionStatus: string;
  statsDelta: 'increment' | 'decrement' | 'none';
}> {
  const existing = await tx.transaction.findUniqueOrThrow({
    where: { id: transactionId },
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

  const snap = snapshotFromTx(existing);
  const prevCommission = coerceCommissionStatus(snap.commissionStatus);
  const prevFraud = coerceFraudStatus(snap.fraudStatus);

  let result: {
    statsDelta: 'increment' | 'decrement' | 'none';
    newCommissionStatus: string;
    newFraudStatus?: string;
  };

  if (action === 'approve') {
    const r = await ownerApprove(tx, snap);
    result = {
      statsDelta: r.statsDelta,
      newCommissionStatus: r.newCommissionStatus,
      newFraudStatus: r.newFraudStatus,
    };
    logInfo({
      event: 'fraud.false_positive_dismissed',
      transactionId,
      message: 'Owner dismissed fraud alert (false positive)',
      data: {
        prevCommission,
        newCommission: r.newCommissionStatus,
        statsDelta: r.statsDelta,
      },
    });
    if (r.statsDelta === 'increment') {
      logInfo({
        event: 'fraud.commission_approved',
        transactionId,
        message: 'Commission approved + stats incremented',
        data: { statsDelta: r.statsDelta },
      });
    }
  } else if (action === 'reject') {
    const r = await ownerReject(tx, snap);
    result = {
      statsDelta: r.statsDelta,
      newCommissionStatus: r.newCommissionStatus,
      newFraudStatus: r.newFraudStatus,
    };
    logInfo({
      event: 'fraud.commission_rejected',
      transactionId,
      message: 'Commission rejected by owner',
      data: {
        prevCommission,
        newCommission: r.newCommissionStatus,
        statsDelta: r.statsDelta,
      },
    });
  } else {
    // suspend
    if (snap.partnerId) {
      await suspendPartner(tx, snap.partnerId);
    }
    result = {
      statsDelta: 'none',
      newCommissionStatus: prevCommission,
      newFraudStatus: prevFraud,
    };
  }

  // Append FraudReviewEvent
  await tx.fraudReviewEvent.create({
    data: {
      transactionId,
      partnerId: snap.partnerId,
      action,
      previousStatus: `${prevFraud}/${prevCommission}`,
      newStatus: `${result.newFraudStatus ?? prevFraud}/${result.newCommissionStatus}`,
      riskScore: 0, // Owner-action events don't carry a risk score; the assessment event does.
      reasons: null,
      actorType: 'owner',
      actorId,
      note: note ?? null,
    },
  });

  logInfo({
    event: 'fraud.review_action',
    transactionId,
    actorId,
    message: `Owner review action: ${action}`,
    data: {
      action,
      prevCommission,
      newCommission: result.newCommissionStatus,
      prevFraud,
      newFraud: result.newFraudStatus ?? prevFraud,
      statsDelta: result.statsDelta,
    },
  });

  return {
    newFraudStatus: result.newFraudStatus ?? prevFraud,
    newCommissionStatus: result.newCommissionStatus,
    statsDelta: result.statsDelta,
  };
}

// ── Re-export for route handler convenience ──

export {
  assessFraud,
  onStatusEnteringSuccess,
  onStatusLeavingSuccess,
  adjustCommissionForPartnerChange,
  coerceCommissionStatus,
  coerceFraudStatus,
};
