/**
 * Phase 2 — Atomic Stats Mutation Service
 *
 * Phase 5 update: partner stats increment/decrement is now commission-aware.
 * The original `applyStatusTransition` still owns the status field update and
 * the customer stats mutation. For partner stats, it delegates to the Phase 5
 * commission lifecycle (src/lib/fraud/commission.ts) so that:
 *   - Success + commission approved → increment partner stats once.
 *   - Success + commission held/rejected → do NOT increment.
 *   - Success → non-success → reverse partner stats only if commission was
 *     approved.
 *
 * Legacy compatibility:
 *   - Transactions created before Phase 5 default to fraudStatus='clear' and
 *     commissionStatus='pending'. When such a transaction reaches success,
 *     `onStatusEnteringSuccess` sees fraudStatus='clear' + commission='pending'
 *     and transitions commission to 'approved' + increments stats. The net
 *     behavior is identical to Phase 2 for legacy rows.
 *
 * Key guarantees (preserved from Phase 2):
 * - Transaction update + partner/customer stats are atomic.
 * - Same-status request is a no-op (no stats touch).
 * - Success → non-success reverses partner stats exactly once.
 * - Non-success → success increments partner stats exactly once.
 * - Uses atomic `{ increment }` / `{ decrement }` (no read-then-write).
 * - Conditional status update: `updateMany` with `where: { id, status: oldStatus }`
 *   prevents double-application under concurrent requests.
 *
 * @module transaction/stats
 */

import { db, toNumber } from '@/lib/db';
import {
  isSameStatus,
  isEnteringSuccess,
  isLeavingSuccess,
  isValidStatus,
} from './status-machine';
import {
  onStatusEnteringSuccess,
  onStatusLeavingSuccess,
  type CommissionTxSnapshot,
} from '@/lib/fraud/commission';

// ── Types ──

export interface TransactionForStats {
  id: string;
  status: string;
  partnerId: string | null;
  customerId: string;
  nominal: unknown;
  partnerProfit: unknown;
  /** Phase 5: fraud status (clear | review | confirmed | dismissed). Defaults to 'clear'. */
  fraudStatus?: string;
  /** Phase 5: commission status (pending | held | approved | rejected | not_applicable). Defaults to 'pending'. */
  commissionStatus?: string;
  /** Phase 5: approved commission amount snapshot. */
  commissionApprovedAmount?: unknown;
}

export interface ApplyStatusTransitionResult {
  transaction: Awaited<ReturnType<typeof db.transaction.update>>;
  statusChanged: boolean;
  statsApplied: boolean;
}

// ── Core: apply status transition atomically ──

/**
 * Apply a status transition to a transaction, with atomic partner stats
 * mutation, inside a single `prisma.$transaction`.
 *
 * This is the SHARED function used by both PATCH /api/transactions/[id] and
 * Telegram /status. It guarantees:
 *
 * 1. Same-status request = no-op (returns existing transaction, no stats touch).
 * 2. Non-success → success: increments partner totalProfit/totalVolume/totalTransactions.
 * 3. Success → non-success: decrements partner totalProfit/totalVolume/totalTransactions.
 * 4. All writes are atomic — partial failure rolls back everything.
 * 5. Conditional update prevents double-application under concurrency.
 *
 * @param txClient - A Prisma transaction client (from `db.$transaction(async (tx) => ...)`)
 * @param existing - The existing transaction (must include partnerId, customerId, nominal, partnerProfit)
 * @param newStatus - The target status (must be validated before calling)
 * @returns The updated transaction + flags indicating what happened
 */
export async function applyStatusTransition(
  txClient: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  existing: TransactionForStats,
  newStatus: string,
): Promise<ApplyStatusTransitionResult> {
  // ── No-op: same status ──
  if (isSameStatus(existing.status, newStatus)) {
    // Re-fetch to return a full transaction object
    const transaction = await txClient.transaction.findUniqueOrThrow({
      where: { id: existing.id },
    });
    return { transaction, statusChanged: false, statsApplied: false };
  }

  // ── Conditional status update (prevents double-application) ──
  // updateMany with where: { id, status: existing.status } ensures that if
  // another concurrent request already changed the status, this update
  // affects 0 rows and we don't double-apply stats.
  const updateResult = await txClient.transaction.updateMany({
    where: { id: existing.id, status: existing.status },
    data: { status: newStatus },
  });

  if (updateResult.count === 0) {
    // Status was already changed by another request — re-read current state
    const transaction = await txClient.transaction.findUniqueOrThrow({
      where: { id: existing.id },
    });
    return { transaction, statusChanged: false, statsApplied: false };
  }

  // ── Partner stats mutation (Phase 5: commission-aware) ──
  //
  // Phase 2 behavior (preserved for legacy/clear-fraud rows):
  //   Non-success → success: increment
  //   Success → non-success: decrement
  //
  // Phase 5 behavior:
  //   On entering success, delegate to `onStatusEnteringSuccess` which checks
  //   fraudStatus + commissionStatus. If clear/pending → commission approved +
  //   increment. If held → leave held, no increment. If already approved → no-op.
  //
  //   On leaving success, delegate to `onStatusLeavingSuccess` which reverses
  //   partner stats only if commission was 'approved' (idempotent — no double
  //   decrement, no negative counters).
  let statsApplied = false;
  if (existing.partnerId) {
    const snap: CommissionTxSnapshot = {
      id: existing.id,
      status: existing.status,
      partnerId: existing.partnerId,
      customerId: existing.customerId,
      nominal: existing.nominal,
      partnerProfit: existing.partnerProfit,
      fraudStatus: existing.fraudStatus ?? 'clear',
      commissionStatus: existing.commissionStatus ?? 'pending',
      commissionApprovedAmount: existing.commissionApprovedAmount ?? 0,
    };

    if (isEnteringSuccess(existing.status, newStatus)) {
      // Set the status field on the snapshot to the NEW status so the
      // commission lifecycle sees the transaction as 'success'.
      const r = await onStatusEnteringSuccess(txClient, {
        ...snap,
        status: newStatus,
      });
      statsApplied = r.statsDelta === 'increment';
    } else if (isLeavingSuccess(existing.status, newStatus)) {
      // Snapshot has status='success' (the OLD status before this transition).
      const r = await onStatusLeavingSuccess(txClient, snap);
      statsApplied = r.statsDelta === 'decrement';
    }
  }

  // ── Fetch the final transaction with relations ──
  const transaction = await txClient.transaction.findUniqueOrThrow({
    where: { id: existing.id },
    include: {
      customer: true,
      paymentType: true,
      marketplace: true,
      partner: true,
    },
  });

  return { transaction, statusChanged: true, statsApplied };
}

// ── Delete with atomic stats reversal ──

/**
 * Delete a transaction with atomic stats reversal.
 *
 * - Customer stats (totalVolume, totalTransactions) are always reversed.
 * - Partner stats (totalProfit, totalVolume, totalTransactions) are reversed
 *   ONLY if the transaction was 'success' AND commission was 'approved'
 *   (Phase 5: held/rejected commissions never counted toward partner stats).
 * - All writes are inside a single `$transaction`.
 *
 * @param existing - The existing transaction (must include partnerId, customerId, nominal, partnerProfit, status)
 */
export async function deleteTransactionWithStatsReversal(
  existing: TransactionForStats & { status: string },
): Promise<void> {
  await db.$transaction(async (tx) => {
    // ── Reverse customer stats (always, regardless of status) ──
    const nominalNum = toNumber(existing.nominal);
    await tx.customer.update({
      where: { id: existing.customerId },
      data: {
        totalVolume: { decrement: nominalNum },
        totalTransactions: { decrement: 1 },
      },
    });

    // ── Reverse partner stats ONLY if was success AND commission was approved ──
    // (Phase 5: held/rejected never counted — no reversal needed.)
    const commissionWasApproved = (existing.commissionStatus ?? 'pending') === 'approved';
    if (existing.partnerId && existing.status === 'success' && commissionWasApproved) {
      const partnerProfitNum = toNumber(existing.partnerProfit);
      await tx.partner.update({
        where: { id: existing.partnerId },
        data: {
          totalVolume: { decrement: nominalNum },
          totalProfit: { decrement: partnerProfitNum },
          totalTransactions: { decrement: 1 },
        },
      });
    }

    // ── Delete the transaction (removes idempotency key + fraud events via cascade) ──
    await tx.transaction.delete({
      where: { id: existing.id },
    });
  });
}

// ── Nominal change with atomic volume adjustment ──

/**
 * Adjust customer and partner volume when a transaction's nominal changes.
 *
 * - Customer totalVolume is always adjusted by the volume diff.
 * - Partner totalVolume is adjusted only if the transaction is 'success' AND
 *   commission is 'approved' (Phase 5: held/rejected don't count).
 *
 * This is called inside the PATCH `$transaction` when nominal changes.
 *
 * @param txClient - A Prisma transaction client
 * @param existing - The existing transaction
 * @param oldNominal - The previous nominal value
 * @param newNominal - The new nominal value
 */
export async function adjustVolumeForNominalChange(
  txClient: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  existing: TransactionForStats,
  oldNominal: number,
  newNominal: number,
): Promise<void> {
  const volumeDiff = newNominal - oldNominal;
  if (volumeDiff === 0) return;

  // Customer volume always tracks
  await txClient.customer.update({
    where: { id: existing.customerId },
    data: {
      totalVolume: { increment: volumeDiff },
    },
  });

  // Partner volume only if success AND commission approved
  const commissionApproved = (existing.commissionStatus ?? 'pending') === 'approved';
  if (existing.partnerId && existing.status === 'success' && commissionApproved) {
    await txClient.partner.update({
      where: { id: existing.partnerId },
      data: {
        totalVolume: { increment: volumeDiff },
      },
    });
  }
}

// ── Partner change with atomic stats swap (Phase 5: commission-aware) ──

/**
 * Adjust partner stats when a transaction's partnerId changes.
 *
 * Phase 5 behavior:
 *   - If old partner exists AND commission was 'approved' AND status was
 *     'success': reverse old partner stats and mark commission as 'rejected'
 *     (the approved state is undone for the old partner).
 *   - The NEW partner's commission state is determined by re-running the
 *     fraud engine after this function returns. If the new commission ends
 *     up 'approved' and status is success, the caller's success-transition
 *     handler will increment the new partner stats.
 *
 * Uses the OLD partnerProfit for the decrement (matches Phase 2 behavior).
 *
 * @param txClient - A Prisma transaction client
 * @param existing - The existing transaction
 * @param newPartnerId - The new partner ID (or null to remove partner)
 * @param newPartnerProfit - The recomputed partner profit for the new partner (UNUSED in Phase 5 — kept for API compat)
 */
export async function adjustStatsForPartnerChange(
  txClient: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  existing: TransactionForStats,
  newPartnerId: string | null,
  newPartnerProfit: number,
): Promise<void> {
  // Phase 5: delegate to commission lifecycle for the reversal side.
  // The new partner's increment will be handled by the fraud assessment +
  // success-transition handler that the caller runs after partnerId is updated.
  void newPartnerProfit; // unused in Phase 5 — kept for backward API compatibility

  const snap: CommissionTxSnapshot = {
    id: existing.id,
    status: existing.status,
    partnerId: existing.partnerId,
    customerId: existing.customerId,
    nominal: existing.nominal,
    partnerProfit: existing.partnerProfit,
    fraudStatus: existing.fraudStatus ?? 'clear',
    commissionStatus: existing.commissionStatus ?? 'pending',
    commissionApprovedAmount: existing.commissionApprovedAmount ?? 0,
  };

  await adjustCommissionForPartnerChange(txClient, snap, newPartnerId);
}

// ── Validation re-export ──

export { isValidStatus };
