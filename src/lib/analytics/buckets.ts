/**
 * Analytics Parameter Allowlist + Normalization
 * ===========================================================================
 *
 * This module is the SINGLE chokepoint that prevents PII from leaking into
 * GA4 / dataLayer. Any key not in ALLOWED_PARAMS is dropped before any
 * dataLayer.push. Values for provider / city / service_type are normalized
 * (lowercased, trimmed, slug-ish) so "BCA", "bca ", " BCA " all map to "bca".
 *
 * Allowlisted parameters (per owner directive — DIRECT GA4 + CONVERSION
 * TRACKING):
 *   page_path        — e.g. "/", "/order", "/register"
 *   page_type        — e.g. "landing", "order_form", "partner_registration"
 *   service_type     — "online" | "cod"
 *   provider         — payment type name (e.g. "bca", "gopay-paylater")
 *                      — NOT the customer's bank account / bank holder name
 *   city             — e.g. "jakarta", "bandung"
 *   amount_bucket    — bucketed nominal (e.g. "100k-500k") — NEVER exact nominal
 *
 * Forbidden (NEVER passed — stripped if present):
 *   name, phone, email, bank, bankAccount, bankHolder, password,
 *   exact nominal / amount, WA message text, WA URL (wa.me/...),
 *   orderId, transactionId, idempotency key, customer ID, address.
 *
 * Scope lock: pure utility module. Does not touch sitemap, transaction
 * formula, fraud, auth, Prisma schema, or UI.
 */

export const ALLOWED_PARAMS = [
  'page_path',
  'page_type',
  'service_type',
  'provider',
  'city',
  'amount_bucket',
] as const;

export type AllowedParam = (typeof ALLOWED_PARAMS)[number];

/** Keys whose values must be normalized (lowercased slug-ish). */
const NORMALIZE_KEYS = new Set<AllowedParam>(['service_type', 'provider', 'city']);

/**
 * Bucket a nominal amount into privacy-safe ranges. Never returns the exact
 * amount. Buckets are coarse enough for marketing attribution but fine
 * enough to segment micro vs whale orders.
 *
 * Returns 'unknown' for null/undefined/NaN/non-finite. Returns '0' for zero.
 */
export function amountBucket(
  nominal: number | null | undefined | string,
): string {
  if (nominal === null || nominal === undefined) return 'unknown';
  const n = typeof nominal === 'string' ? Number(nominal) : nominal;
  if (!Number.isFinite(n)) return 'unknown';
  if (n <= 0) return '0';
  // IDR buckets
  if (n < 100_000) return '<100k';
  if (n < 500_000) return '100k-500k';
  if (n < 1_000_000) return '500k-1M';
  if (n < 5_000_000) return '1M-5M';
  if (n < 10_000_000) return '5M-10M';
  return '10M+';
}

/**
 * Normalize a value: stringify, lowercase, trim, collapse internal
 * whitespace to single hyphens, drop runs of non-[a-z0-9-], trim
 * leading/trailing hyphens. Used for provider / city / service_type.
 *
 * Empty / null / undefined / whitespace-only input returns '' — caller
 * should drop the param entirely (don't push empty values to GA4).
 */
export function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim().toLowerCase();
  if (!s) return '';
  let collapsed = s.replace(/\s+/g, '-');
  collapsed = collapsed.replace(/[^a-z0-9-]+/g, '-');
  collapsed = collapsed.replace(/-+/g, '-');
  return collapsed.replace(/^-+|-+$/g, '');
}

/**
 * Allowlist + normalize parameters. Drops any key not in ALLOWED_PARAMS.
 * For NORMALIZE_KEYS, the value is normalized (slug-ish lowercase).
 * For amount_bucket: passes through if it's a non-empty string, else
 *   buckets the numeric input.
 * For page_path / page_type: passes through trimmed (NOT lowercased —
 *   page_path "/Order" is meaningful and paths are case-sensitive in routing).
 *
 * Empty values are dropped entirely (no empty-string params sent to GA4).
 *
 * Returns a clean object safe to push to dataLayer / pass to gtag('event').
 * The input object is NOT mutated.
 */
export function sanitizeParams(
  input: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ALLOWED_PARAMS) {
    if (!(key in input)) continue;
    const raw = input[key];
    if (raw === null || raw === undefined) continue;
    let value: string;
    if (key === 'amount_bucket') {
      value =
        typeof raw === 'string' && raw.trim()
          ? raw.trim()
          : amountBucket(raw as number);
    } else if (NORMALIZE_KEYS.has(key)) {
      value = normalizeValue(raw);
    } else {
      // page_path, page_type — keep case, just trim
      value = String(raw).trim();
    }
    if (!value) continue;
    out[key] = value;
  }
  return out;
}
