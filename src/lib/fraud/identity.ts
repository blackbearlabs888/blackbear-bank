/**
 * Phase 5 — Identity Normalization Service
 *
 * Single canonicalization helper used by the fraud engine to compare
 * customer/partner identities deterministically.
 *
 * Governance rules enforced:
 * - Phone: 08, 628, +628 → canonical 62xxx format (same as customer-utils.normalizePhone
 *   to remain consistent with existing customer matching).
 * - Bank account: digits only, trim leading formatting characters.
 * - Name/bank holder: lowercase, trim, collapse whitespace, remove harmless punctuation.
 * - Email: lowercase + trim.
 *
 * Privacy:
 * - This module performs normalization ONLY. It does NOT log raw phone,
 *   rekening, bank holder, or email. Callers must not log normalized values
 *   either — they are still PII.
 * - No new fingerprint schema is introduced. Identity comparison uses
 *   existing Partner/Customer columns.
 *
 * Determinism:
 * - Same input MUST always produce the same normalized output. No time-based
 *   or random behavior.
 *
 * @module fraud/identity
 */

// ── Phone ──

/**
 * Normalize an Indonesian phone number to canonical 62xxx format.
 *
 * Accepts: 08xxx, 628xxx, +628xxx, 8xxx (assumes local).
 * Returns: 62xxx (no leading + or 0).
 * Empty/invalid input returns ''.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = String(phone).replace(/[\s\-().]/g, '');
  // Strip leading +
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  // Convert 0xxx → 62xxx
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('62')) {
    // already canonical
  } else if (/^\d{8,}$/.test(cleaned)) {
    // Local number without prefix — assume Indonesian
    cleaned = '62' + cleaned;
  } else {
    return cleaned;
  }
  return cleaned;
}

// ── Bank account ──

/**
 * Normalize a bank account number to digits only.
 *
 * Trims leading/trailing whitespace and removes separators (spaces, dashes).
 * Returns '' for empty input.
 */
export function normalizeBankAccount(account: string | null | undefined): string {
  if (!account) return '';
  const digits = String(account).replace(/[\s\-]/g, '');
  return digits;
}

// ── Name / bank holder ──

/**
 * Normalize a personal/business name for comparison.
 *
 * - Lowercase
 * - Trim leading/trailing whitespace
 * - Collapse internal whitespace runs to a single space
 * - Remove harmless punctuation (.,'-)
 *
 * NOT a fuzzy match. Two normalized names are compared with strict equality.
 * Per directive: name-only match is a WEAK signal and never blocks alone.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[.,'\-]/g, '')
    .replace(/\s+/g, ' ');
}

// ── Email ──

/**
 * Normalize an email address: lowercase + trim.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return String(email).toLowerCase().trim();
}

// ── City ──

/**
 * Normalize a city name for comparison (same as normalizeName but kept
 * separate for clarity). City match is informational only (score +0).
 */
export function normalizeCity(city: string | null | undefined): string {
  return normalizeName(city);
}

// ── Masking (for owner-facing API responses) ──

/**
 * Mask a phone number for display in owner-facing fraud review responses.
 * Returns the last 4 digits prefixed by ••••.
 *
 * Example: '6281234567890' → '••••7890'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const s = String(phone);
  if (s.length <= 4) return '••••' + s;
  return '••••' + s.slice(-4);
}

/**
 * Mask a bank account number for display.
 * Returns the last 4 digits prefixed by ••••.
 */
export function maskBankAccount(account: string | null | undefined): string {
  if (!account) return '';
  const s = String(account);
  if (s.length <= 4) return '••••' + s;
  return '••••' + s.slice(-4);
}

/**
 * Mask a personal name: show first letter of each word + bullet.
 * Example: 'Budi Santoso' → 'B• S•'
 * Example: 'Budi' → 'B•'
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 0) return '';
  return parts.map((p) => p.charAt(0).toUpperCase() + '•').join(' ');
}
