#!/usr/bin/env bun
/**
 * Phase 3 — Partner Stats Reconciliation Script (READ-ONLY)
 *
 * Usage:  bun run scripts/reconcile-partners.ts
 *
 * Compares each Partner's stored denormalized counters against a fresh
 * recomputation from successful transactions. Prints a table to stdout.
 *
 * This script:
 *   - Performs ONLY SELECT queries
 *   - NEVER writes to the database
 *   - NEVER mutates data
 *   - NEVER creates cron jobs or schedules
 *
 * Output columns:
 *   PARTNER_ID (masked) | NAME | FIELD | STORED | CALCULATED | DELTA | STATUS
 *
 * Exit code:
 *   0 — all partners MATCH (or no partners to check)
 *   0 — some DRIFT detected (drift is reported, NOT auto-fixed; exit 0 so CI
 *       doesn't fail on a read-only diagnostic)
 *
 * @module scripts/reconcile-partners
 */

import { reconcilePartners, maskId } from '../src/lib/observability/reconcile';

async function main() {
  console.log('=== Black Bear Partner Reconciliation (READ-ONLY) ===\n');

  const result = await reconcilePartners();

  console.log(`Generated at: ${result.generatedAt}`);
  console.log(`Total partners checked: ${result.total}`);
  console.log(`  MATCH: ${result.matched}`);
  console.log(`  DRIFT: ${result.drifted}`);
  console.log('');

  if (result.rows.length === 0) {
    console.log('No partners with transactions found. Nothing to reconcile.\n');
    process.exit(0);
  }

  // Print per-partner rows
  for (const row of result.rows) {
    const idMasked = maskId(row.partnerId);
    const tag = row.status === 'MATCH' ? '✓ MATCH' : '✗ DRIFT';
    console.log(`--- ${tag}  ${row.partnerName}  [${idMasked}] ---`);
    console.log(
      `  totalProfit:        stored=${row.stored.totalProfit.toFixed(2)}  calc=${row.calculated.totalProfit.toFixed(2)}  delta=${row.delta.totalProfit.toFixed(2)}`,
    );
    console.log(
      `  totalVolume:        stored=${row.stored.totalVolume.toFixed(2)}  calc=${row.calculated.totalVolume.toFixed(2)}  delta=${row.delta.totalVolume.toFixed(2)}`,
    );
    console.log(
      `  totalTransactions:  stored=${row.stored.totalTransactions}       calc=${row.calculated.totalTransactions}       delta=${row.delta.totalTransactions}`,
    );
    console.log('');
  }

  console.log('=== Reconciliation complete. NO data was modified. ===\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Reconciliation script failed:', error);
  process.exit(1);
});
