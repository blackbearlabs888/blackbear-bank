/**
 * Safe JSON-LD Serializer (Phase 1.2 — Finding 5)
 *
 * `JSON.stringify` alone is NOT safe to inject into a <script> tag. The HTML
 * parser looks for the literal substring `</script>` ANYWHERE inside the
 * script body — including inside string literals — and treats it as the end
 * of the script element. An attacker who controls any string field of the
 * JSON-LD object can break out of the script tag and inject arbitrary HTML
 * (e.g. a string value of `</script><script>alert(1)</script>`).
 *
 * This module serializes JSON-LD objects using a single, centralized,
 * defence-in-depth serializer that:
 *   1. Calls `JSON.stringify` for valid JSON output.
 *   2. Escapes `<` → `\u003c` so the literal substring `</script>` can NEVER
 *      appear in the serialized output. This is the canonical mitigation
 *      recommended by OWASP and used by React's own `dangerouslySetInnerHTML`
 *      when emitting inline JSON.
 *   3. Also escapes `>` → `\u003e`, `&` → `\u0026`, and the line/paragraph
 *      separators U+2028 and U+2029 (which are valid JSON but invalid in
 *      JavaScript string literals — they would break `JSON.parse`-free
 *      eval-style consumers, even though we always use JSON.parse).
 *
 * The schema.org data structure is NOT modified — only the string escaping
 * changes. Consumers parsing the JSON-LD via `JSON.parse` get back the exact
 * original object.
 *
 * USAGE (replace all `dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }}`
 *        with `dangerouslySetInnerHTML={{ __html: safeJsonLd(x) }}`):
 *
 *   import { safeJsonLd } from '@/lib/json-ld-safe';
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdObject) }} />
 */

/**
 * Serialize a JSON-LD object for safe injection into a <script> tag.
 *
 * Returns a string that:
 *   - Is valid JSON (parses back to the original object via JSON.parse).
 *   - Contains NO literal `</script>` substring (so HTML parsing is safe).
 *   - Contains NO unescaped `<`, `>`, `&`, U+2028, U+2029.
 */
export function safeJsonLd(value: unknown): string {
  // First produce canonical JSON. We do NOT add a `null` check — if value is
  // undefined, JSON.stringify returns undefined (not a string), which is
  // wrong for HTML injection. Coerce to null which serialises to "null".
  const json = JSON.stringify(value === undefined ? null : value);
  if (typeof json !== 'string') return 'null';

  // Defence-in-depth escape pass. Order matters: do `&` first so we don't
  // double-escape the `&` we add for `<` and `>`.
  return json
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
