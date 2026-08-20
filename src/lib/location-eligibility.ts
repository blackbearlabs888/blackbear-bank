import 'server-only';
import { db } from '@/lib/db';

/**
 * SEO Batch 1 QA correction #4 — single source of truth for "is this location
 * eligible to be promoted on the public site?"
 *
 * Source of truth (already locked): a location is eligible iff
 *   1. `Location.isActive === true`, AND
 *   2. at least one `Partner` with `status === 'active'` exists whose `city`
 *      (trimmed + lowercased) equals the location's `name` (trimmed +
 *      lowercased).
 *
 * This mirrors `src/app/sitemap.ts` lines 119–164 exactly — same three queries,
 * same JS-side case-insensitive join (NOT Prisma `mode: 'insensitive'`, which
 * the sitemap deliberately avoids for cross-DB safety between SQLite dev and
 * PostgreSQL prod). The two consumers that previously used a looser
 * `isActive`-only predicate (`/pencairan-kartu-kredit` and `/pencairan-paylater`
 * pillar pages) now call `isPalangkaRayaEligible()` so the link they render
 * matches the sitemap's eligibility rule 1:1.
 *
 * Scope: read-only helper. Does NOT mutate the DB, schema, sitemap rules,
 * transaction engine, auth, or fraud logic.
 */

/**
 * Returns the set of slugs of eligible locations (active location AND ≥1 active
 * partner serving that city). Mirrors `src/app/sitemap.ts` lines 119–164.
 */
export async function getEligibleLocationSlugs(): Promise<Set<string>> {
  const [locations, activePartners] = await Promise.all([
    db.location.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
    }),
    db.partner.findMany({
      where: { status: 'active' },
      select: { city: true },
    }),
  ]);

  const activeCities = new Set(
    activePartners
      .map((p) => p.city?.trim().toLowerCase())
      .filter((c): c is string => !!c),
  );

  return new Set(
    locations
      .filter((loc) => activeCities.has(loc.name.trim().toLowerCase()))
      .map((loc) => loc.slug),
  );
}

/**
 * Convenience: is the Palangka Raya location eligible per the sitemap rule
 * (active location AND ≥1 active partner serving Palangka Raya)?
 *
 * Slug match is exact ('palangka-raya'). The city match on the partner side is
 * against the location's `name` field (case-insensitive, trimmed) — identical
 * to how the sitemap joins.
 */
export async function isPalangkaRayaEligible(): Promise<boolean> {
  try {
    const eligible = await getEligibleLocationSlugs();
    return eligible.has('palangka-raya');
  } catch {
    return false;
  }
}
