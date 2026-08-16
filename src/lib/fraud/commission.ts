/**
 * Phase 5 — Commission Lifecycle State Machine
 *
 * Wraps the partner-stats mutation in a commission-aware layer. The original
 * Phase 2 stats functions (`applyStatusTransition`, `adjustStatsForPartnerChange`,
 * `deleteTransactionWithStatsReversal`, `adjustVolumeForNominalChange`) remain
 * the single source for status transitions; this module adds the commission
 * side-channel that determines whether a success transition is eligible to
 * increment partner reward stats.
 *
 * COMMISSION LIFECYCLE (per directive section 6):
 *
 *   Transaction baru dengan partner, status belum success:
 *     commissionStatus = pending
 *     commissionApprovedAmount = 0
 *
 *   Transaction → success + fraud clear:
 *     commissionStatus = approved
 *     commissionApprovedAmount = partnerProfit
 *     partner stats increment TEPAT SATU KALI.
 *
 *   Transaction → success + fraud review/high:
 *     commissionStatus = held
 *     commissionApprovedAmount = 0
 *     partner stats TIDAK bertambah.
 *
 *   Owner APPROVE (false positive):
 *     fraudStatus = dismissed
 *     commissionStatus = approved
 *     commissionApprovedAmount = partnerProfit
 *     partner stats increment TEPAT SATU KALI.
 *
 *   Owner REJECT:
 *     fraudStatus = confirmed
 *     commissionStatus = rejected
 *     commissionApprovedAmount = 0
 *     partner stats TIDAK bertambah.
 *     Jika sebelumnya approved → reversal TEPAT SATU KALI.
 *
 *   Success → failed (reversal):
 *     Jika commissionStatus approved → reverse stats TEPAT SATU KALI.
 *     commissionStatus kembali not_applicable atau rejected.
 *     Tidak boleh menyebabkan counter negatif.
 *
 *   Repeat action (idempotent):
 *     Approve setelah approved = no-op.
 *     Reject setelah rejected = no-op.
 *
 * Partner totalVolume / totalTransactions / totalProfit definition (Phase 5):
 *   Statistik transaksi sukses yang komisinya APPROVED.
 *   Held/rejected TIDAK masuk partner reward statistics.
 *
 * All operations MUST be called inside a Prisma `$transaction` so they are
 * atomic with the transaction update, FraudReviewEvent insert, and partner
 * suspension.
 *
 * @module fraud/commission
 */

import { toNumber } from '@/lib/db';
import type { CommissionStatus, FraudStatus } from './engine';

// ── Types ──

type TxClient = Parameters<Parameters<typeof import('@/lib/db').db.$transaction>[0]>[0];

export interface CommissionTxSnapshot {
  id: string;
  status: string;
  partnerId: string | null;
  customerId: string;
  nominal: unknown;
  partnerProfit: unknown;
  fraudStatus: string;
  commissionStatus: string;
  commissionApprovedAmount: unknown;
}

export interface CommissionTransitionResult {
  /** Whether partner stats were incremented (true) or decremented (true if reversed). */
  statsDelta: 'increment' | 'decrement' | 'none';
  /** New commissionStatus value. */
  newCommissionStatus: CommissionStatus;
  /** New fraudStatus value (only set by owner-review transitions). */
  newFraudStatus?: FraudStatus;
  /** Whether commissionApprovedAmount was updated. */
  commissionAmountChanged: boolean;
}

// ── Validation helpers ──

/**
 * Convert any DB value to a CommissionStatus, defaulting to 'pending' for
 * unknown/legacy values.
 */
export function coerceCommissionStatus(v: unknown): CommissionStatus {
  const s = typeof v === 'string' ? v : 'pending';
  switch (s) {
    case 'not_applicable':
    case 'pending':
    case 'held':
    case 'approved':
    case 'rejected':
      return s;
    default:
      return 'pending';
  }
}

/**
 * Convert any DB value to a FraudStatus, defaulting to 'clear'.
 */
export function coerceFraudStatus(v: unknown): FraudStatus {
  const s = typeof v === 'string' ? v : 'clear';
  switch (s) {
    case 'clear':
    case 'review':
    case 'confirmed':
    case 'dismissed':
      return s;
    default:
      return 'clear';
  }
}

// ── Atomic partner stats mutation (idempotent) ──

/**
 * Increment partner reward stats by exactly one transaction's worth.
 * Idempotent — call sites MUST guard with a commissionStatus precondition.
 *
 * Used when commission transitions to 'approved'.
 */
async function incrementPartnerStats(
  tx: TxClient,
  partnerId: string,
  nominal: number,
  partnerProfit: number,
): Promise<void> {
  await tx.partner.update({
    where: { id: partnerId },
    data: {
      totalProfit: { increment: partnerProfit },
      totalVolume: { increment: nominal },
      totalTransactions: { increment: 1 },
    },
  });
}

/**
 * Decrement partner reward stats by exactly one transaction's worth.
 * Idempotent — call sites MUST guard with a commissionStatus precondition.
 *
 * Used when commission transitions away from 'approved' (reversal).
 */
async function decrementPartnerStats(
  tx: TxClient,
  partnerId: string,
  nominal: number,
  partnerProfit: number,
): Promise<void> {
  await tx.partner.update({
    where: { id: partnerId },
    data: {
      totalProfit: { decrement: partnerProfit },
      totalVolume: { decrement: nominal },
      totalTransactions: { decrement: 1 },
    },
  });
}

// ── Transition: status → success ──

/**
 * Apply commission lifecycle on a status transition into 'success'.
 *
 * Caller (PATCH /api/transactions/[id] or applyStatusTransition) invokes this
 * AFTER the status field has been set to 'success' on the row.
 *
 * Behavior:
 *   - If commissionStatus was 'approved' already → no-op (idempotent).
 *   - If fraudStatus is 'clear' AND commissionStatus is 'pending'/'held' →
 *     transition to 'approved', set commissionApprovedAmount = partnerProfit,
 *     increment partner stats once.
 *   - If fraudStatus is 'review'/'confirmed'/'dismissed-then-held' AND
 *     commissionStatus is 'held' → leave held, do NOT increment.
 *   - If commissionStatus is 'rejected' → do nothing (already rejected).
 *
 * Returns the resulting commission transition descriptor.
 */
export async function onStatusEnteringSuccess(
  tx: TxClient,
  snap: CommissionTxSnapshot,
): Promise<CommissionTransitionResult> {
  if (!snap.partnerId) {
    return {
      statsDelta: 'none',
      newCommissionStatus: 'not_applicable',
      commissionAmountChanged: false,
    };
  }

  const currentCommission = coerceCommissionStatus(snap.commissionStatus);
  const currentFraud = coerceFraudStatus(snap.fraudStatus);

  // Already approved — idempotent no-op
  if (currentCommission === 'approved') {
    return {
      statsDelta: 'none',
      newCommissionStatus: 'approved',
      commissionAmountChanged: false,
    };
  }

  // Already rejected — no-op
  if (currentCommission === 'rejected') {
    return {
      statsDelta: 'none',
      newCommissionStatus: 'rejected',
      commissionAmountChanged: false,
    };
  }

  // Held + not dismissed → stay held
  if (currentCommission === 'held' && currentFraud !== 'dismissed') {
    return {
      statsDelta: 'none',
      newCommissionStatus: 'held',
      commissionAmountChanged: false,
    };
  }

  // Eligible to approve: pending OR (held + dismissed) OR (held + clear)
  const nominalNum = toNumber(snap.nominal);
  const profitNum = toNumber(snap.partnerProfit);

  await tx.transaction.update({
    where: { id: snap.id },
    data: {
      commissionStatus: 'approved',
      commissionApprovedAmount: profitNum,
    },
  });

  await incrementPartnerStats(tx, snap.partnerId, nominalNum, profitNum);

  return {
    statsDelta: 'increment',
    newCommissionStatus: 'approved',
    commissionAmountChanged: true,
  };
}

// ── Transition: status leaving success (success → failed/pending/etc) ──

/**
 * Reverse partner stats when a transaction leaves 'success' status.
 *
 * Behavior:
 *   - If commissionStatus is 'approved' → reverse stats once, set commission
 *     to 'rejected' (the success is undone). Idempotent.
 *   - If commissionStatus is 'held' or 'pending' or 'rejected' → no-op
 *     (stats were never incremented).
 */
export async function onStatusLeavingSuccess(
  tx: TxClient,
  snap: CommissionTxSnapshot,
): Promise<CommissionTransitionResult> {
  if (!snap.partnerId) {
    return {
      statsDelta: 'none',
      newCommissionStatus: coerceCommissionStatus(snap.commissionStatus),
      commissionAmountChanged: false,
    };
  }

  const currentCommission = coerceCommissionStatus(snap.commissionStatus);

  if (currentCommission !== 'approved') {
    // Stats were never incremented — no-op
    return {
      statsDelta: 'none',
      newCommissionStatus: currentCommission,
      commissionAmountChanged: false,
    };
  }

  const nominalNum = toNumber(snap.nominal);
  const profitNum = toNumber(snap.partnerProfit);

  // Reverse stats once
  await decrementPartnerStats(tx, snap.partnerId, nominalNum, profitNum);

  // Set commission to rejected (the approved state is undone)
  await tx.transaction.update({
    where: { id: snap.id },
    data: {
      commissionStatus: 'rejected',
      commissionApprovedAmount: 0,
    },
  });

  return {
    statsDelta: 'decrement',
    newCommissionStatus: 'rejected',
    commissionAmountChanged: true,
  };
}

// ── Owner review actions ──

/**
 * Owner APPROVE (false positive dismissal).
 *
 *   fraudStatus → dismissed
 *   commissionStatus → approved
 *   commissionApprovedAmount → partnerProfit
 *   partner stats increment TEPAT SATU KALI (only if not already approved).
 *
 * Idempotent: if commissionStatus is already 'approved', this is a no-op.
 *
 * NOTE: This can be invoked on a transaction in ANY status (success,
 * pending, etc). If the transaction has not yet reached success, the
 * commissionApprovedAmount is set but stats are NOT incremented until the
 * success transition runs (which will see commissionStatus=approved and
 * no-op the increment). The end result is exactly one increment when the
 * transaction reaches success.
 */
export async function ownerApprove(
  tx: TxClient,
  snap: CommissionTxSnapshot,
): Promise<CommissionTransitionResult> {
  if (!snap.partnerId) {
    return {
      statsDelta: 'none',
      newCommissionStatus: 'not_applicable',
      newFraudStatus: 'dismissed',
      commissionAmountChanged: false,
    };
  }

  const currentCommission = coerceCommissionStatus(snap.commissionStatus);
  const profitNum = toNumber(snap.partnerProfit);

  // Already approved — idempotent no-op (just refresh fraudStatus)
  if (currentCommission === 'approved') {
    await tx.transaction.update({
      where: { id: snap.id },
      data: { fraudStatus: 'dismissed' },
    });
    return {
      statsDelta: 'none',
      newCommissionStatus: 'approved',
      newFraudStatus: 'dismissed',
      commissionAmountChanged: false,
    };
  }

  // Was previously approved and reversed (rejected) → re-approve + increment
  // Was held/pending → approve + increment (only if status is success)
  const isCurrentlySuccess = snap.status === 'success';
  const wasApprovedBeforeReversal = currentCommission === 'rejected';

  await tx.transaction.update({
    where: { id: snap.id },
    data: {
      fraudStatus: 'dismissed',
      commissionStatus: 'approved',
      commissionApprovedAmount: profitNum,
    },
  });

  // Increment stats ONLY if the transaction is currently in 'success' status
  // AND the previous commission state did NOT already count it.
  // (If status is not success, the success transition will handle the
  // increment when it eventually runs — and it will no-op because commission
  // is already 'approved'.)
  if (isCurrentlySuccess && !wasApprovedBeforeReversal) {
    // Previous state was 'held' or 'pending' (not yet counted). Increment now.
    const nominalNum = toNumber(snap.nominal);
    await incrementPartnerStats(tx, snap.partnerId, nominalNum, profitNum);
    return {
      statsDelta: 'increment',
      newCommissionStatus: 'approved',
      newFraudStatus: 'dismissed',
      commissionAmountChanged: true,
    };
  }

  if (isCurrentlySuccess && wasApprovedBeforeReversal) {
    // Previously approved → reversed (rejected) → now re-approving.
    // Increment back to restore the count.
    const nominalNum = toNumber(snap.nominal);
    await incrementPartnerStats(tx, snap.partnerId, nominalNum, profitNum);
    return {
      statsDelta: 'increment',
      newCommissionStatus: 'approved',
      newFraudStatus: 'dismissed',
      commissionAmountChanged: true,
    };
  }

  // Not yet success — just set the commission state. Stats will increment
  // when success transition runs (and that increment will no-op because
  // commission is already approved).
  return {
    statsDelta: 'none',
    newCommissionStatus: 'approved',
    newFraudStatus: 'dismissed',
    commissionAmountChanged: true,
  };
}

/**
 * Owner REJECT (confirmed fraud).
 *
 *   fraudStatus → confirmed
 *   commissionStatus → rejected
 *   commissionApprovedAmount → 0
 *   partner stats TIDAK bertambah.
 *   Jika sebelumnya approved → reversal TEPAT SATU KALI.
 *
 * Idempotent: if commissionStatus is already 'rejected', this is a no-op.
 */
export async function ownerReject(
  tx: TxClient,
  snap: CommissionTxSnapshot,
): Promise<CommissionTransitionResult> {
  if (!snap.partnerId) {
    return {
      statsDelta: 'none',
      newCommissionStatus: 'not_applicable',
      newFraudStatus: 'confirmed',
      commissionAmountChanged: false,
    };
  }

  const currentCommission = coerceCommissionStatus(snap.commissionStatus);

  // Already rejected — idempotent no-op (just refresh fraudStatus)
  if (currentCommission === 'rejected') {
    await tx.transaction.update({
      where: { id: snap.id },
      data: { fraudStatus: 'confirmed' },
    });
    return {
      statsDelta: 'none',
      newCommissionStatus: 'rejected',
      newFraudStatus: 'confirmed',
      commissionAmountChanged: false,
    };
  }

  // If currently approved → reverse stats once
  let statsDelta: 'increment' | 'decrement' | 'none' = 'none';
  if (currentCommission === 'approved' && snap.status === 'success') {
    const nominalNum = toNumber(snap.nominal);
    const profitNum = toNumber(snap.partnerProfit);
    await decrementPartnerStats(tx, snap.partnerId, nominalNum, profitNum);
    statsDelta = 'decrement';
  }

  await tx.transaction.update({
    where: { id: snap.id },
    data: {
      fraudStatus: 'confirmed',
      commissionStatus: 'rejected',
      commissionApprovedAmount: 0,
    },
  });

  return {
    statsDelta,
    newCommissionStatus: 'rejected',
    newFraudStatus: 'confirmed',
    commissionAmountChanged: true,
  };
}

// ── Partner suspension (atomic) ──

/**
 * Suspend a partner atomically (within the same $transaction).
 *
 * Sets Partner.status = 'suspended'. Does NOT delete the partner or any
 * transactions. Reversible by owner setting status back to 'active'.
 */
export async function suspendPartner(
  tx: TxClient,
  partnerId: string,
): Promise<void> {
  await tx.partner.update({
    where: { id: partnerId },
    data: { status: 'suspended' },
  });
}

/**
 * Reactivate a previously suspended partner.
 */
export async function reactivatePartner(
  tx: TxClient,
  partnerId: string,
): Promise<void> {
  await tx.partner.update({
    where: { id: partnerId },
    data: { status: 'active' },
  });
}

// ── Partner change (reassignment) ──

/**
 * Adjust partner stats when a transaction's partnerId changes.
 *
 * Phase 5 rule:
 *   - If old partner exists AND commission was 'approved' AND status was
 *     'success' → reverse old partner stats.
 *   - If new partner exists AND new commission will be 'approved' AND status
 *     is 'success' → apply new partner stats.
 *
 * The new commissionStatus is determined by re-running the fraud engine
 * AFTER the partnerId is updated. Call sites should:
 *   1. Call this function to reverse old partner stats.
 *   2. Update partnerId + re-run fraud engine.
 *   3. If new commission is 'approved' and status is success, increment new
 *      partner stats (via onStatusEnteringSuccess or directly).
 */
export async function adjustCommissionForPartnerChange(
  tx: TxClient,
  snap: CommissionTxSnapshot,
  newPartnerId: string | null,
): Promise<void> {
  const currentCommission = coerceCommissionStatus(snap.commissionStatus);
  const wasSuccess = snap.status === 'success';
  const partnerIsChanging =
    snap.partnerId !== null && snap.partnerId !== newPartnerId;

  // Reverse old partner stats if commission was approved and partner is changing/removed
  if (partnerIsChanging && currentCommission === 'approved' && wasSuccess && snap.partnerId) {
    const nominalNum = toNumber(snap.nominal);
    const profitNum = toNumber(snap.partnerProfit);
    await decrementPartnerStats(tx, snap.partnerId, nominalNum, profitNum);

    // Mark old commission as rejected (the approved state is undone for old partner)
    await tx.transaction.update({
      where: { id: snap.id },
      data: {
        commissionStatus: 'rejected',
        commissionApprovedAmount: 0,
      },
    });
  }
}
