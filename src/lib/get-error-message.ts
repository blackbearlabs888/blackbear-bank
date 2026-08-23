/**
 * Centralized, browser-safe error message normalizer.
 *
 * Prevents React crash "Objects are not valid as a React child" by ensuring
 * every value passed to `toast.*()` or rendered inside JSX is always a plain
 * string. No Prisma, DB, server-only, or Node API imports — safe for client bundles.
 *
 * Sensitive keys (requestId, code, stack, password, token, payload) are
 * stripped so internal details never leak to the UI.
 */

const STRIPPED_KEYS = new Set([
  'requestId',
  'code',
  'stack',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'payload',
  'details',
  'cause',
]);

/**
 * Extract a user-safe error message from any value.
 *
 * @param value  - The raw error value (API response, caught exception, etc.)
 * @param fallback - Fallback message when nothing useful can be extracted
 * @returns A plain string safe for `toast.error()` and JSX rendering
 */
export function getErrorMessage(
  value: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.',
): string {
  // 1. Primitive string (most common fast-path)
  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  // 2. Native Error (including sub-classes like TypeError, SyntaxError)
  if (value instanceof Error) {
    return value.message?.trim() || fallback;
  }

  // 3. null / undefined / booleans / numbers
  if (value == null || typeof value !== 'object') {
    return fallback;
  }

  // 4. Objects — recursively extract .message or .error
  const obj = value as Record<string, unknown>;

  // 4a. Direct .message string
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return obj.message.trim();
  }

  // 4b. .error_description (OAuth-style human-readable message)
  //     Checked BEFORE .error so OAuth {error:'code',error_description:'msg'}
  //     returns the human message, not the machine-readable code.
  if (
    typeof obj.error_description === 'string' &&
    obj.error_description.trim()
  ) {
    return obj.error_description.trim();
  }

  // 4c. Nested .error — recurse (covers both {error:"str"} and {error:{code,message,requestId}})
  if (obj.error !== undefined && obj.error !== null) {
    return getErrorMessage(obj.error, fallback);
  }

  // 4d. .data.error pattern (some API wrappers)
  if (
    obj.data &&
    typeof obj.data === 'object' &&
    (obj.data as Record<string, unknown>).error !== undefined
  ) {
    return getErrorMessage(
      (obj.data as Record<string, unknown>).error,
      fallback,
    );
  }

  // 4e. Last resort: first string-valued property that isn't a sensitive key
  for (const key of Object.keys(obj)) {
    if (STRIPPED_KEYS.has(key)) continue;
    if (typeof obj[key] === 'string' && (obj[key] as string).trim()) {
      return (obj[key] as string).trim();
    }
  }

  return fallback;
}
