/**
 * Phase 2 — Single Fee Calculation Source
 *
 * Consolidates every fee/margin/profit computation into ONE function so that
 * public order create, owner/partner transaction create, preview, PATCH
 * (nominal/marketplace/discount), and Telegram (/nominal, /mp) all produce
 * identical results for the same inputs.
 *
 * Governance rules enforced:
 * - Jangan mengubah formula fee yang berlaku (rule 2).
 * - Jangan mengubah nilai transaksi lama (rule 3).
 * - Preview result harus identik dengan persisted transaction result.
 *
 * Rounding policy (documented, not changed):
 * - Intermediate calculations use JS `number` (IEEE 754 double).
 * - No explicit rounding is applied — the same behavior as the original
 *   `calculatePaymentFee` / `calculateMarginBreakdown` in `src/lib/auth/index.ts`.
 * - Persisted as Float in SQLite, Decimal in PostgreSQL.
 * - Display layer (`formatCurrency`) rounds to integer Rupiah for display only.
 *
 * @module transaction/fee
 */

import { toNumber } from '@/lib/db';

// ── Types ──

export interface PaymentTypeInput {
  name: string;
  onlineFeePercent: number | { toNumber(): number } | unknown;
  onlineFeeFlat: number | { toNumber(): number } | unknown;
  codFeePercent: number | { toNumber(): number } | unknown;
  codFeeFlat: number | { toNumber(): number } | unknown;
  threshold: number | { toNumber(): number } | unknown;
  discountPercent: number | { toNumber(): number } | unknown;
  discountNominal: number | { toNumber(): number } | unknown;
  minTransaction: number | { toNumber(): number } | unknown;
}

export interface MarketplaceInput {
  name: string;
  feePercent: number | { toNumber(): number } | unknown;
  feeFlat: number | { toNumber(): number } | unknown;
}

export interface PartnerInput {
  commission: number | { toNumber(): number } | unknown;
}

export interface CalculateTransactionInput {
  nominal: number;
  paymentType: PaymentTypeInput;
  marketplace: MarketplaceInput | null;
  partner: PartnerInput | null;
  methodTransaction: string; // 'Online' | 'COD'
  /** Override discount percent (from PATCH body); undefined = use paymentType default */
  discountPercentOverride?: number;
  /** Override discount nominal (from PATCH body); undefined = use paymentType default */
  discountNominalOverride?: number;
}

export interface TransactionCalculation {
  nominal: number;
  originalFee: number;
  discountPercent: number;
  discountAmount: number;
  paymentFee: number;
  platformFee: number;
  netMargin: number;
  partnerCommissionPercent: number;
  partnerProfit: number;
  ownerProfit: number;
  totalReceived: number;
  /** Snapshot of fee-input config for persistence as feeConfigSnapshot */
  feeConfigSnapshot: string;
  paymentTypeName: string;
  marketplaceName: string | null;
}

// ── Helpers (ported verbatim from src/lib/auth/index.ts to preserve formula) ──

/**
 * Calculate the gross payment fee (before discount) using the threshold logic.
 *
 * This is the EXACT same formula as the original `calculatePaymentFee` in
 * `src/lib/auth/index.ts:186-210`.
 *
 * Rounding: no explicit rounding (matches original behavior).
 * Threshold: inclusive `>=` (matches original behavior).
 * Normalization: `feePercent > 100` → `/1000` (matches original behavior).
 */
function calculateGrossPaymentFee(
  nominal: number,
  feePercent: number,
  feeFlat: number,
  threshold: number,
): number {
  let pct = feePercent;
  if (pct > 100) {
    pct = pct / 1000;
  }
  if (nominal >= threshold) {
    return nominal * (pct / 100);
  }
  return feeFlat;
}

/**
 * Calculate marketplace platform fee.
 *
 * Formula (matches original inline copies in /api/transactions/route.ts:218-225
 * and /api/transactions/[id]/route.ts:321-328):
 *   platformFee = nominal * (mpFeePercent / 100) + mpFeeFlat
 * With the same `> 100` normalization guard.
 */
function calculatePlatformFee(
  nominal: number,
  mpFeePercent: number,
  mpFeeFlat: number,
): number {
  let pct = mpFeePercent;
  if (pct > 100) {
    pct = pct / 1000;
  }
  return nominal * (pct / 100) + mpFeeFlat;
}

/**
 * Calculate margin breakdown (matches original `calculateMarginBreakdown`
 * in src/lib/auth/index.ts:213-227).
 *
 *   netMargin     = paymentFee - platformFee
 *   partnerProfit = netMargin * (partnerRate / 100)
 *   ownerProfit   = netMargin - partnerProfit
 */
function calculateMarginBreakdown(
  paymentFee: number,
  platformFee: number,
  partnerRate: number,
): { netMargin: number; partnerProfit: number; ownerProfit: number } {
  const netMargin = paymentFee - platformFee;
  const partnerProfit = netMargin * (partnerRate / 100);
  const ownerProfit = netMargin - partnerProfit;
  return { netMargin, partnerProfit, ownerProfit };
}

// ── Consolidated calculation ──

/**
 * Calculate the full transaction breakdown from inputs.
 *
 * This is the SINGLE source of truth for Phase 2. Every write path
 * (public order, owner/partner create, PATCH nominal/marketplace/discount,
 * Telegram /nominal and /mp) and the preview endpoint MUST call this function.
 *
 * Discount logic (ported from /api/transactions/route.ts:263-279):
 * - If `discountPercentOverride` or `discountNominalOverride` is provided
 *   (from PATCH body), use that. Otherwise use paymentType defaults.
 * - Discount only applies if `nominal >= minTransaction` (or minTransaction <= 0).
 * - Percent discount: `discountAmount = originalFee * (percent / 100)`.
 * - Nominal discount: `discountAmount = min(nominal, originalFee)`.
 * - `paymentFee = max(0, originalFee - discountAmount)`.
 *
 * @returns TransactionCalculation with all 11 monetary fields + snapshot data.
 */
export function calculateTransaction(input: CalculateTransactionInput): TransactionCalculation {
  const nominal = toNumber(input.nominal);
  const method = input.methodTransaction === 'COD' ? 'COD' : 'Online';

  // ── Extract payment type fields ──
  const ptOnlineFeePercent = toNumber(input.paymentType.onlineFeePercent);
  const ptOnlineFeeFlat = toNumber(input.paymentType.onlineFeeFlat);
  const ptCodFeePercent = toNumber(input.paymentType.codFeePercent);
  const ptCodFeeFlat = toNumber(input.paymentType.codFeeFlat);
  const ptThreshold = toNumber(input.paymentType.threshold);
  const ptDiscountPercent = toNumber(input.paymentType.discountPercent) || 0;
  const ptDiscountNominal = toNumber(input.paymentType.discountNominal) || 0;
  const ptMinTransaction = toNumber(input.paymentType.minTransaction) || 0;

  // ── Gross payment fee (before discount) ──
  const feePercent = method === 'Online' ? ptOnlineFeePercent : ptCodFeePercent;
  const feeFlat = method === 'Online' ? ptOnlineFeeFlat : ptCodFeeFlat;
  const originalFee = calculateGrossPaymentFee(nominal, feePercent, feeFlat, ptThreshold);

  // ── Discount ──
  const effectiveDiscountPercent =
    input.discountPercentOverride !== undefined
      ? Math.max(0, Math.min(toNumber(input.discountPercentOverride), 100))
      : ptDiscountPercent;
  const effectiveDiscountNominal =
    input.discountNominalOverride !== undefined
      ? Math.max(0, toNumber(input.discountNominalOverride))
      : ptDiscountNominal;

  const meetsMinTransaction = ptMinTransaction <= 0 || nominal >= ptMinTransaction;

  let discountAmount = 0;
  let appliedDiscountPercent = 0;

  if (meetsMinTransaction && (effectiveDiscountPercent > 0 || effectiveDiscountNominal > 0)) {
    if (effectiveDiscountPercent > 0) {
      discountAmount = originalFee * (effectiveDiscountPercent / 100);
      appliedDiscountPercent = effectiveDiscountPercent;
    } else if (effectiveDiscountNominal > 0) {
      discountAmount = Math.min(effectiveDiscountNominal, originalFee);
      appliedDiscountPercent = originalFee > 0 ? (discountAmount / originalFee) * 100 : 0;
    }
  }

  const paymentFee = Math.max(0, originalFee - discountAmount);

  // ── Platform fee ──
  let platformFee = 0;
  let marketplaceName: string | null = null;
  if (input.marketplace) {
    const mpFeePercent = toNumber(input.marketplace.feePercent);
    const mpFeeFlat = toNumber(input.marketplace.feeFlat);
    platformFee = calculatePlatformFee(nominal, mpFeePercent, mpFeeFlat);
    marketplaceName = input.marketplace.name;
  }

  // ── Margin breakdown ──
  const partnerCommissionPercent = input.partner ? toNumber(input.partner.commission) || 0 : 0;
  const { netMargin, partnerProfit, ownerProfit } = calculateMarginBreakdown(
    paymentFee,
    platformFee,
    partnerCommissionPercent,
  );

  const totalReceived = nominal - paymentFee;

  // ── Fee config snapshot (JSON string for persistence) ──
  const feeConfigSnapshot = JSON.stringify({
    paymentType: {
      onlineFeePercent: ptOnlineFeePercent,
      onlineFeeFlat: ptOnlineFeeFlat,
      codFeePercent: ptCodFeePercent,
      codFeeFlat: ptCodFeeFlat,
      threshold: ptThreshold,
      discountPercent: ptDiscountPercent,
      discountNominal: ptDiscountNominal,
      minTransaction: ptMinTransaction,
    },
    marketplace: input.marketplace
      ? {
          feePercent: toNumber(input.marketplace.feePercent),
          feeFlat: toNumber(input.marketplace.feeFlat),
        }
      : null,
  });

  return {
    nominal,
    originalFee,
    discountPercent: appliedDiscountPercent,
    discountAmount,
    paymentFee,
    platformFee,
    netMargin,
    partnerCommissionPercent,
    partnerProfit,
    ownerProfit,
    totalReceived,
    feeConfigSnapshot,
    paymentTypeName: input.paymentType.name,
    marketplaceName,
  };
}

/**
 * Phase 2 calculation version.
 * - 0 = legacy (pre-Phase 2 rows; snapshot fields are NULL)
 * - 1 = Phase 2 (snapshot fields populated)
 *
 * New transactions created/mutated via Phase 2 write paths MUST set this to 1.
 */
export const CALCULATION_VERSION_PHASE2 = 1;
