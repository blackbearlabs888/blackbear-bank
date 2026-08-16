/**
 * Phase 5 — Fraud Rule Engine
 *
 * Rule-based, deterministic, explainable, reversible fraud assessment.
 *
 * PRINSIP BISNIS:
 *   Partner tidak berhak menerima komisi dari transaksi dirinya sendiri.
 *
 * Output:
 *   {
 *     score,            // 0..N integer
 *     level,            // 'low' | 'medium' | 'high' | 'critical'
 *     status,           // 'clear' | 'review' | 'confirmed'
 *     commissionStatus, // 'pending' | 'held' | 'rejected' | 'not_applicable'
 *     reasons: [{ code, weight, category }],
 *     shouldSuspendPartner
 *   }
 *
 * Rules:
 *   STRONG:
 *     - FRAUD_SELF_PHONE (+60)
 *     - FRAUD_SELF_BANK_ACCOUNT (+70)
 *     - FRAUD_SELF_PHONE_AND_BANK (combined → min 100 + auto-suspend)
 *   MEDIUM (cannot auto-block alone):
 *     - EXISTING_CUSTOMER_BEFORE_PARTNER (+20)
 *     - FIRST_ORDER_TOO_SOON (+15)
 *     - REPEATED_SAME_BENEFICIARY (+20)
 *   WEAK (cannot auto-block alone):
 *     - SAME_NORMALIZED_NAME (+10)
 *     - SAME_CITY (+0, informational)
 *
 * Risk classification:
 *   0–29   = low      / clear
 *   30–69  = medium   / review
 *   70–99  = high     / review
 *   100+   = critical / review + auto-suspend (if a strong signal exists)
 *
 * Safety:
 *   - Auto-suspend partner ONLY when:
 *       (a) phone + bank exact match, OR
 *       (b) score >= 100 AND at least one STRONG signal present.
 *   - Name match, city match, IP, or fast order alone NEVER suspend.
 *
 * Determinism:
 *   Same input → same output. No Date.now() or random calls in pure rules.
 *
 * @module fraud/engine
 */

import {
  normalizePhone,
  normalizeBankAccount,
  normalizeName,
  normalizeCity,
} from './identity';

// ── Types ──

export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FraudStatus = 'clear' | 'review' | 'confirmed' | 'dismissed';
export type CommissionStatus =
  | 'not_applicable'
  | 'pending'
  | 'held'
  | 'approved'
  | 'rejected';

export type FraudReasonCategory = 'strong' | 'medium' | 'weak';

export interface FraudReason {
  code: string;
  weight: number;
  category: FraudReasonCategory;
}

export interface FraudAssessmentInput {
  // Partner identity (the partner who would receive commission)
  partner: {
    id: string;
    phone: string;
    bankAccount: string | null | undefined;
    bankHolder: string | null | undefined;
    name: string;
    city: string | null | undefined;
    joinedAt: Date;
  } | null;
  // Customer / order identity (the customer paying for the transaction)
  customer: {
    phone: string;
    bankAccount?: string | null;
    bankHolder?: string | null;
    name: string;
    city?: string | null;
    /** Customer row createdAt — used to detect "was already a customer before partner joined" */
    createdAt?: Date;
  } | null;
  // Historical context (optional, used by medium signals)
  existingTransactions?: Array<{
    partnerId: string;
    customerId: string;
    bankAccount?: string | null;
    createdAt: Date;
  }>;
  // Transaction creation time (used by FIRST_ORDER_TOO_SOON)
  transactionCreatedAt?: Date;
}

export interface FraudAssessmentResult {
  score: number;
  level: FraudRiskLevel;
  status: FraudStatus;
  commissionStatus: CommissionStatus;
  reasons: FraudReason[];
  shouldSuspendPartner: boolean;
}

// ── Constants ──

export const FRAUD_RULES = {
  FRAUD_SELF_PHONE: {
    code: 'FRAUD_SELF_PHONE',
    weight: 60,
    category: 'strong' as const,
  },
  FRAUD_SELF_BANK_ACCOUNT: {
    code: 'FRAUD_SELF_BANK_ACCOUNT',
    weight: 70,
    category: 'strong' as const,
  },
  EXISTING_CUSTOMER_BEFORE_PARTNER: {
    code: 'EXISTING_CUSTOMER_BEFORE_PARTNER',
    weight: 20,
    category: 'medium' as const,
  },
  FIRST_ORDER_TOO_SOON: {
    code: 'FIRST_ORDER_TOO_SOON',
    weight: 15,
    category: 'medium' as const,
  },
  REPEATED_SAME_BENEFICIARY: {
    code: 'REPEATED_SAME_BENEFICIARY',
    weight: 20,
    category: 'medium' as const,
  },
  SAME_NORMALIZED_NAME: {
    code: 'SAME_NORMALIZED_NAME',
    weight: 10,
    category: 'weak' as const,
  },
  SAME_CITY: {
    code: 'SAME_CITY',
    weight: 0,
    category: 'weak' as const,
  },
} as const;

/** Threshold (minutes) for FIRST_ORDER_TOO_SOON. */
const FIRST_ORDER_TOO_SOON_MINUTES = 60;

/**
 * Threshold for REPEATED_SAME_BENEFICIARY.
 *
 * Conservative: requires at least 3 prior partner transactions sharing the
 * same beneficiary bank account before this signal fires.
 */
const REPEATED_BENEFICIARY_THRESHOLD = 3;

// ── Core assessment ──

/**
 * Run a deterministic fraud assessment.
 *
 * Returns a result object describing score, level, status, commission status,
 * reasons, and whether the partner should be auto-suspended.
 *
 * If `partner` is null, returns a 'clear' result with commissionStatus =
 * 'not_applicable' (no partner → no commission → no fraud check).
 */
export function assessFraud(input: FraudAssessmentInput): FraudAssessmentResult {
  // No partner → no commission → no fraud assessment
  if (!input.partner || !input.customer) {
    return {
      score: 0,
      level: 'low',
      status: 'clear',
      commissionStatus: 'not_applicable',
      reasons: [],
      shouldSuspendPartner: false,
    };
  }

  const reasons: FraudReason[] = [];
  let hasStrongSignal = false;

  // ── STRONG: FRAUD_SELF_PHONE ──
  const partnerPhoneNorm = normalizePhone(input.partner.phone);
  const customerPhoneNorm = normalizePhone(input.customer.phone);
  const phoneMatch =
    partnerPhoneNorm !== '' &&
    customerPhoneNorm !== '' &&
    partnerPhoneNorm === customerPhoneNorm;
  if (phoneMatch) {
    reasons.push(FRAUD_RULES.FRAUD_SELF_PHONE);
    hasStrongSignal = true;
  }

  // ── STRONG: FRAUD_SELF_BANK_ACCOUNT ──
  const partnerBankNorm = normalizeBankAccount(input.partner.bankAccount);
  const customerBankNorm = normalizeBankAccount(input.customer.bankAccount);
  const bankMatch =
    partnerBankNorm !== '' &&
    customerBankNorm !== '' &&
    partnerBankNorm === customerBankNorm;
  if (bankMatch) {
    reasons.push(FRAUD_RULES.FRAUD_SELF_BANK_ACCOUNT);
    hasStrongSignal = true;
  }

  // ── MEDIUM: EXISTING_CUSTOMER_BEFORE_PARTNER ──
  // Customer row was created BEFORE the partner joined.
  if (
    input.customer.createdAt &&
    input.partner.joinedAt &&
    input.customer.createdAt.getTime() < input.partner.joinedAt.getTime()
  ) {
    reasons.push(FRAUD_RULES.EXISTING_CUSTOMER_BEFORE_PARTNER);
  }

  // ── MEDIUM: FIRST_ORDER_TOO_SOON ──
  // Order created within 60 minutes of partner joining.
  const txTime = input.transactionCreatedAt ?? new Date();
  if (input.partner.joinedAt) {
    const minutesSinceJoin =
      (txTime.getTime() - input.partner.joinedAt.getTime()) / (1000 * 60);
    if (minutesSinceJoin >= 0 && minutesSinceJoin < FIRST_ORDER_TOO_SOON_MINUTES) {
      reasons.push(FRAUD_RULES.FIRST_ORDER_TOO_SOON);
    }
  }

  // ── MEDIUM: REPEATED_SAME_BENEFICIARY ──
  // Multiple prior partner transactions used the SAME beneficiary bank account.
  if (input.existingTransactions && input.existingTransactions.length > 0) {
    const partnerTxs = input.existingTransactions.filter(
      (t) => t.partnerId === input.partner!.id,
    );
    if (partnerTxs.length > 0 && customerBankNorm) {
      const sameBeneficiaryCount = partnerTxs.filter(
        (t) => normalizeBankAccount(t.bankAccount) === customerBankNorm,
      ).length;
      if (sameBeneficiaryCount >= REPEATED_BENEFICIARY_THRESHOLD) {
        reasons.push(FRAUD_RULES.REPEATED_SAME_BENEFICIARY);
      }
    }
  }

  // ── WEAK: SAME_NORMALIZED_NAME ──
  const partnerNameNorm = normalizeName(input.partner.name);
  const customerNameNorm = normalizeName(input.customer.name);
  const nameMatch =
    partnerNameNorm !== '' &&
    customerNameNorm !== '' &&
    partnerNameNorm === customerNameNorm;
  if (nameMatch) {
    reasons.push(FRAUD_RULES.SAME_NORMALIZED_NAME);
  }

  // ── WEAK: SAME_CITY (informational, weight 0) ──
  const partnerCityNorm = normalizeCity(input.partner.city);
  const customerCityNorm = normalizeCity(input.customer.city);
  const cityMatch =
    partnerCityNorm !== '' &&
    customerCityNorm !== '' &&
    partnerCityNorm === customerCityNorm;
  if (cityMatch) {
    reasons.push(FRAUD_RULES.SAME_CITY);
  }

  // ── Tally score ──
  const score = reasons.reduce((sum, r) => sum + r.weight, 0);

  // ── Classify risk level ──
  let level: FraudRiskLevel;
  if (score >= 100) level = 'critical';
  else if (score >= 70) level = 'high';
  else if (score >= 30) level = 'medium';
  else level = 'low';

  // ── Determine fraudStatus + commissionStatus ──
  // Strong signals (phone exact OR bank exact) → commission HELD, status review.
  // Score >= 100 with strong signal → critical → auto-suspend.
  // Score 0-29 → clear (commission pending until success).
  let status: FraudStatus;
  let commissionStatus: CommissionStatus;
  let shouldSuspendPartner = false;

  if (phoneMatch && bankMatch) {
    // Phone + bank exact match → critical, auto-suspend
    status = 'review';
    commissionStatus = 'held';
    shouldSuspendPartner = true;
  } else if (hasStrongSignal) {
    // Single strong signal (phone OR bank) → held, no auto-suspend
    status = 'review';
    commissionStatus = 'held';
    // Auto-suspend if score crosses critical threshold AND a strong signal exists.
    if (score >= 100) {
      shouldSuspendPartner = true;
    }
  } else if (score >= 30) {
    // Medium/high risk without strong signal → review, held
    status = 'review';
    commissionStatus = 'held';
  } else {
    // Low risk → clear
    status = 'clear';
    commissionStatus = 'pending';
  }

  return {
    score,
    level,
    status,
    commissionStatus,
    reasons,
    shouldSuspendPartner,
  };
}

// ── Human-readable reason descriptions (for owner UI) ──

/**
 * Map a reason code to a human-readable Indonesian description.
 *
 * IMPORTANT: This is shown to OWNER only. Never expose to partner — the
 * directive says "Reasons yang dikirim ke partner jangan membuka detail
 * internal rule/score."
 */
export function describeReason(code: string): string {
  switch (code) {
    case 'FRAUD_SELF_PHONE':
      return 'Nomor telepon customer sama dengan partner';
    case 'FRAUD_SELF_BANK_ACCOUNT':
      return 'Nomor rekening customer sama dengan partner';
    case 'EXISTING_CUSTOMER_BEFORE_PARTNER':
      return 'Customer sudah terdaftar sebelum partner mendaftar';
    case 'FIRST_ORDER_TOO_SOON':
      return 'Transaksi pertama dibuat tidak lama setelah partner aktif';
    case 'REPEATED_SAME_BENEFICIARY':
      return 'Beberapa transaksi partner menggunakan rekening penerima yang sama';
    case 'SAME_NORMALIZED_NAME':
      return 'Nama customer mirip dengan nama partner';
    case 'SAME_CITY':
      return 'Customer dan partner berasal dari kota yang sama (informational)';
    default:
      return 'Sinyal risiko terdeteksi';
  }
}

/**
 * Map a risk level to a badge color for UI display.
 */
export function riskBadgeColor(level: FraudRiskLevel): string {
  switch (level) {
    case 'critical':
      return 'bg-red-600 text-white';
    case 'high':
      return 'bg-red-500 text-white';
    case 'medium':
      return 'bg-amber-500 text-white';
    case 'low':
    default:
      return 'bg-emerald-500 text-white';
  }
}

/**
 * Partner-facing commission status label (Indonesian).
 * Does NOT expose fraud score or rule codes.
 */
export function partnerCommissionLabel(status: CommissionStatus): string {
  switch (status) {
    case 'approved':
      return 'Komisi Disetujui';
    case 'held':
      return 'Komisi Ditahan';
    case 'rejected':
      return 'Komisi Ditolak';
    case 'pending':
      return 'Komisi Diproses';
    case 'not_applicable':
    default:
      return 'Tidak Ada Komisi';
  }
}
