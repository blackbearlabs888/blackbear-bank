/**
 * Phase 2 — Status State Machine (centralized validator)
 *
 * Governance correction: "Pertahankan transition behavior existing pada
 * Phase 2. Jangan memperketat atau mengubah kebijakan status tanpa keputusan
 * bisnis. Fokus pada centralization, atomic stats, dan retry safety."
 *
 * The existing codebase allows ANY status to transition to ANY other status
 * (membership-only validation). This module centralizes that SAME behavior
 * so that PATCH /api/transactions/[id] and Telegram /status use the same
 * validator. No transitions are tightened or loosened.
 *
 * The key additions over the original ad-hoc checks:
 * - Single source of truth for valid statuses.
 * - Same-status detection (no-op) is explicit and shared.
 * - Telegram /status and PATCH /status use the same function.
 *
 * @module transaction/status-machine
 */

export type TransactionStatus = 'pending' | 'verification' | 'process' | 'success' | 'failed';

export const VALID_STATUSES: TransactionStatus[] = [
  'pending',
  'verification',
  'process',
  'success',
  'failed',
];

/**
 * Check if a string is a valid transaction status.
 * Centralized replacement for the ad-hoc `validStatuses.includes(status)`
 * checks that were duplicated in PATCH and Telegram.
 */
export function isValidStatus(value: string): value is TransactionStatus {
  return VALID_STATUSES.includes(value as TransactionStatus);
}

/**
 * Determine if a status transition should be treated as a no-op.
 *
 * Same-status request = no-op. The caller MUST short-circuit before any
 * stats mutation when this returns true, preventing double-increment.
 */
export function isSameStatus(from: string, to: string): boolean {
  return from === to;
}

/**
 * Determine if the transition involves entering 'success' state.
 * Used by the stats service to decide whether to increment partner stats.
 */
export function isEnteringSuccess(oldStatus: string, newStatus: string): boolean {
  return oldStatus !== 'success' && newStatus === 'success';
}

/**
 * Determine if the transition involves leaving 'success' state.
 * Used by the stats service to decide whether to reverse partner stats.
 */
export function isLeavingSuccess(oldStatus: string, newStatus: string): boolean {
  return oldStatus === 'success' && newStatus !== 'success';
}

/**
 * Validate and normalize a status string.
 *
 * Returns the normalized status if valid, or null if invalid.
 * This does NOT reject any transition direction — it only validates
 * that the status is a known value (preserving existing behavior).
 */
export function validateStatus(status: string): TransactionStatus | null {
  const normalized = status.toLowerCase();
  if (isValidStatus(normalized)) {
    return normalized;
  }
  return null;
}
