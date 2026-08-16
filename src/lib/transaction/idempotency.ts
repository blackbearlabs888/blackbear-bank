/**
 * Phase 2 — Idempotency
 *
 * Prevents duplicate transaction creation on network retry.
 *
 * Flow:
 * 1. Client generates a UUID v4 on form mount (in-memory only, NOT persisted
 *    to localStorage/sessionStorage).
 * 2. Client sends `X-Idempotency-Key` header with the POST request.
 * 3. Server computes SHA-256 of the canonicalized request payload.
 * 4. Server looks up transaction by idempotencyKey.
 *    - If found and hash matches → return existing transaction (200, replay).
 *    - If found and hash differs → 409 Conflict (same key, different payload).
 *    - If not found → proceed with create.
 * 5. On unique-constraint violation (concurrent duplicate) → re-read and
 *    apply step 4 logic.
 *
 * Scope: the key is globally unique across all transactions (one key = one
 * transaction, regardless of customer). Nominal+phone is NOT used as identity
 * because two legitimate transactions can have the same values.
 *
 * @module transaction/idempotency
 */

import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

// ── Types ──

export interface IdempotencyCheckResult {
  /** The idempotency key from the header, or null if not provided */
  key: string | null;
  /** The SHA-256 hash of the canonicalized payload, or null if no key */
  hash: string | null;
}

// ── Canonicalization ──

/**
 * Canonicalize a request payload for hashing.
 *
 * Ensures semantically-equivalent requests produce the same hash:
 * - JSON keys sorted alphabetically (recursive)
 * - Strings trimmed
 * - Phone numbers normalized (strip spaces/dashes; +62 → 0)
 * - Numbers passed through as-is (1e6 and 1000000 are different strings
 *   but the same number — JSON.stringify handles this)
 *
 * This is a pure function with no side effects.
 */
export function canonicalizePayload(payload: unknown): string {
  return JSON.stringify(sortKeysDeep(normalizeValues(payload)));
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(value as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

function normalizeValues(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    // Normalize phone-like strings: strip whitespace/dashes, convert +62 to 0
    const trimmed = value.trim();
    // Detect Indonesian phone pattern after stripping non-digits
    if (/^\+?62/.test(trimmed)) {
      const digits = trimmed.replace(/[\s\-+]/g, '');
      if (digits.startsWith('62')) {
        return '0' + digits.slice(2);
      }
    }
    // For other strings with digits and separators, strip spaces and dashes
    // but only if it looks like a phone or account number
    if (/^[\d\s\-]+$/.test(trimmed) && /\s|-/.test(trimmed)) {
      return trimmed.replace(/[\s\-]/g, '');
    }
    return trimmed;
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(normalizeValues);
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = normalizeValues(v);
    }
    return result;
  }
  return value;
}

/**
 * Compute the SHA-256 hash of a canonicalized payload.
 */
export function hashPayload(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex');
}

// ── Header extraction ──

/**
 * Extract the idempotency key from request headers.
 *
 * Accepts both `X-Idempotency-Key` and `x-idempotency-key` (HTTP headers
 * are case-insensitive, but NextRequest normalizes to lowercase).
 *
 * Validates the format: must be a non-empty string, max 128 chars.
 * Returns null if the header is absent or invalid.
 */
export function extractIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get('x-idempotency-key');
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 128) {
    return null;
  }
  return trimmed;
}

/**
 * Prepare idempotency data from request headers + body.
 *
 * Returns { key, hash } if the header is present, or { key: null, hash: null }
 * if not. The hash is computed from the canonicalized body.
 */
export function prepareIdempotency(
  headers: Headers,
  body: unknown,
): IdempotencyCheckResult {
  const key = extractIdempotencyKey(headers);
  if (!key) {
    return { key: null, hash: null };
  }
  const canonical = canonicalizePayload(body);
  const hash = hashPayload(canonical);
  return { key, hash };
}

// ── Prisma error detection ──

/**
 * Check if a Prisma error is a unique-constraint violation (P2002).
 *
 * Used to detect concurrent duplicate idempotency key insertion.
 * The handler catches this, re-reads by key, and returns the existing row.
 */
export function isUniqueConstraintViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
