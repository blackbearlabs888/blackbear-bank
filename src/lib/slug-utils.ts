/**
 * Slug normalization utility.
 *
 * Used by the sitemap to deduplicate location URLs so that one city only
 * ever has one landing page entry, even if duplicate Location rows exist
 * with slugs that normalize to the same string.
 *
 * Idempotent:  normalizeSlug(normalizeSlug(x)) === normalizeSlug(x)
 * Deterministic: same input always produces same output
 *
 * NOTE: This normalizes *formatting* (case, whitespace, hyphens) but does
 * NOT collapse genuinely different spellings. For example, "palangka-raya"
 * and "palangkaraya" are different words and will NOT be merged by this
 * function.
 *
 * Canonical direction (owner-approved): the official spelling is
 * "Palangka Raya" (with space), so normalizeSlug("Palangka Raya") produces
 * the canonical slug "palangka-raya". The legacy single-word spelling
 * "Palangkaraya" normalizes to "palangkaraya" and is a LEGACY alias
 * candidate for 301 redirect to the canonical. To map legacy inputs back
 * to the canonical name before deriving a slug, use canonicalCityName()
 * in city-utils.ts. The merge + 301 of any existing production row is an
 * approval gate (see docs/SITEMAP-LOCATION-AUDIT.md section 5) — not
 * executed until production read-only evidence is reviewed.
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // collapse non-alphanumeric runs to single hyphen
    .replace(/^-+|-+$/g, ''); // strip leading/trailing hyphens
}
