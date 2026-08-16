/**
 * Phase 3 — Partner Stats Reconciliation (READ-ONLY)
 *
 * Compares each Partner's stored denormalized counters:
 *   - totalProfit
 *   - totalVolume
 *   - totalTransactions
 *
 * ...against a fresh recomputation from Transaction rows where status='success'.
 *
 * Output: per-partner row with stored vs calculated values, delta, and a
 * MATCH/DRIFT status. Partners with zero transactions AND zero stored counters
 * are excluded (they're trivially consistent).
 *
 * CRITICAL GUARANTEES:
 *   - This function NEVER writes to the database.
 *   - It NEVER mutates data.
 *   - It NEVER creates cron jobs or schedules.
 *   - It is NOT exposed to partners or the public — only owner.
 *   - Identifiers are maskable in log output via `maskId()`.
 *
 * The "calculated" side uses the SAME definition as Phase 2 stats mutation:
 *   - totalProfit   = SUM(partnerProfit)  WHERE status='success' AND partnerId = X
 *   - totalVolume   = SUM(nominal)        WHERE status='success' AND partnerId = X
 *   - totalTransactions = COUNT(*)         WHERE status='success' AND partnerId = X
 *
 * If stored != calculated for any field → DRIFT. Otherwise → MATCH.
 *
 * @module observability/reconcile
 */

import { db, toNumber } from '@/lib/db';

// ── Types ──

export interface PartnerReconciliationRow {
  partnerId: string;
  partnerName: string;
  stored: {
    totalProfit: number;
    totalVolume: number;
    totalTransactions: number;
  };
  calculated: {
    totalProfit: number;
    totalVolume: number;
    totalTransactions: number;
  };
  delta: {
    totalProfit: number;
    totalVolume: number;
    totalTransactions: number;
  };
  status: 'MATCH' | 'DRIFT';
}

export interface ReconciliationResult {
  total: number;
  matched: number;
  drifted: number;
  rows: PartnerReconciliationRow[];
  generatedAt: string;
}

// ── Masking (for log output, not for the structured result) ──

/**
 * Mask a CUID/UUID for log output, keeping the first 6 and last 4 characters.
 * Example: 'clxxxx1234567890abcdef' → 'clxxxx…cdef'
 *
 * The structured reconciliation result includes the full partnerId because it
 * is owner-only and needed for follow-up. Masking is only for free-form log
 * lines.
 */
export function maskId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

// ── Core reconciliation ──

/**
 * Run a read-only reconciliation of all partners' stored counters vs
 * recomputed values from successful transactions.
 *
 * This function performs ONLY SELECT queries. It never writes.
 */
export async function reconcilePartners(): Promise<ReconciliationResult> {
  // Fetch all partners with their stored counters
  const partners = await db.partner.findMany({
    select: {
      id: true,
      name: true,
      totalProfit: true,
      totalVolume: true,
      totalTransactions: true,
    },
    orderBy: { id: 'asc' },
  });

  // Recompute from successful transactions, grouped by partnerId
  // Using a raw groupBy is more efficient than per-partner queries.
  const aggregated = await db.transaction.groupBy({
    by: ['partnerId'],
    where: { status: 'success', partnerId: { not: null } },
    _sum: {
      nominal: true,
      partnerProfit: true,
    },
    _count: true,
  });

  // Build a lookup map: partnerId → calculated values
  const calcMap = new Map<
    string,
    { totalProfit: number; totalVolume: number; totalTransactions: number }
  >();
  for (const agg of aggregated) {
    if (!agg.partnerId) continue;
    calcMap.set(agg.partnerId, {
      totalProfit: toNumber(agg._sum.partnerProfit),
      totalVolume: toNumber(agg._sum.nominal),
      totalTransactions: agg._count,
    });
  }

  const rows: PartnerReconciliationRow[] = [];

  for (const p of partners) {
    const stored = {
      totalProfit: toNumber(p.totalProfit),
      totalVolume: toNumber(p.totalVolume),
      totalTransactions: p.totalTransactions,
    };
    const calculated = calcMap.get(p.id) ?? {
      totalProfit: 0,
      totalVolume: 0,
      totalTransactions: 0,
    };

    // Skip partners that have never had a successful transaction AND have
    // zero stored counters — they are trivially consistent and would just
    // add noise.
    if (
      calculated.totalTransactions === 0 &&
      stored.totalTransactions === 0 &&
      stored.totalProfit === 0 &&
      stored.totalVolume === 0
    ) {
      continue;
    }

    const delta = {
      totalProfit: stored.totalProfit - calculated.totalProfit,
      totalVolume: stored.totalVolume - calculated.totalVolume,
      totalTransactions: stored.totalTransactions - calculated.totalTransactions,
    };

    // Use a small epsilon for float comparison (monetary rounding)
    const epsilon = 0.01;
    const matches =
      Math.abs(delta.totalProfit) < epsilon &&
      Math.abs(delta.totalVolume) < epsilon &&
      delta.totalTransactions === 0;

    rows.push({
      partnerId: p.id,
      partnerName: p.name,
      stored,
      calculated,
      delta,
      status: matches ? 'MATCH' : 'DRIFT',
    });
  }

  return {
    total: rows.length,
    matched: rows.filter((r) => r.status === 'MATCH').length,
    drifted: rows.filter((r) => r.status === 'DRIFT').length,
    rows,
    generatedAt: new Date().toISOString(),
  };
}
