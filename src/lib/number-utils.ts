/**
 * Numeric coercion utility — browser-safe.
 *
 * Extracted from src/lib/db.ts so that browser-side code (e.g. the landing
 * rate calculator) can import `toNumber` WITHOUT pulling `@prisma/client`
 * into the client bundle.
 *
 * The original `src/lib/db.ts` re-exports this function for backward
 * compatibility with existing server-side imports — server code that
 * already does `import { toNumber } from '@/lib/db'` continues to work
 * unchanged. New browser-side code should import directly from
 * `'@/lib/number-utils'`.
 *
 * Duck-typing rationale:
 *   The original implementation in db.ts used `instanceof Decimal` from
 *   '@prisma/client' to detect Prisma Decimal objects. That forced the
 *   entire @prisma/client runtime (PrismaClient, connection pools, native
 *   binaries) into any module that imported toNumber — making it
 *   server-only. In practice, the only operation needed is `.toNumber()`,
 *   which is a method on Decimal, BigNumber, and similar numeric wrappers.
 *   Duck-typing on `typeof value.toNumber === 'function'` is behaviorally
 *   equivalent for all real inputs (Prisma Decimal, plain number, string,
 *   null/undefined) and removes the @prisma/client dependency from this
 *   module's import graph.
 *
 * @module number-utils
 */

/**
 * Convert a value to a plain JavaScript number.
 *
 * Handles:
 *   - `null` / `undefined` → 0
 *   - `number` → returned as-is (including NaN — caller's responsibility)
 *   - Prisma Decimal / BigNumber / any object with `.toNumber()` → called
 *   - `string` → `parseFloat` (returns 0 if NaN)
 *   - anything else → `Number(value)` (returns 0 if NaN)
 *
 * @param value - The value to coerce. Unknown type accepted because this
 *                function is called from many loosely-typed call sites
 *                (Prisma rows, form inputs, JSON snapshots).
 * @returns A plain number. Never returns NaN — returns 0 for unparseable input.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Duck-typed Decimal check (replaces `instanceof Decimal` from db.ts
  // so this module does not transitively import @prisma/client). This
  // works for Prisma Decimal, bignumber.js, BN.js, and any numeric
  // wrapper that exposes `.toNumber()`.
  if (value && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  if (typeof value === 'string') return parseFloat(value) || 0;
  return Number(value) || 0;
}
