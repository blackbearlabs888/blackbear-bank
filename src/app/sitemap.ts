import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { normalizeSlug } from '@/lib/slug-utils';
import { canonicalCityName } from '@/lib/city-utils';

// Canonical host fallback. Production must set NEXT_PUBLIC_SITE_URL; the
// fallback below matches the canonical www host so a missing env var can
// never emit non-canonical (apex) URLs into sitemap.xml.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc';

/**
 * Route-level ISR — cache the generated sitemap for 1 hour so crawlers
 * and visitors do NOT trigger 3 Neon PostgreSQL queries on every request.
 * Revalidation is automatic every 3600s; the cache is also busted on
 * new deploys (Vercel) and on demand via `revalidateTag` (future hook).
 */
export const revalidate = 3600;

/**
 * Sitemap — only public, active, indexable content with real service
 * coverage is listed.
 *
 * Static pages:
 *   - / (home), /order, /blog, /faq, /lokasi
 *
 * Removed from sitemap:
 *   - /track — personalized order-lookup tool, not indexable content.
 *     The route remains accessible (200) but carries robots.noindex.
 *
 * Dynamic pages:
 *   - /blog/<published-slug>   — BlogPost where isPublished = true
 *   - /lokasi/<slug>           — Location where isActive = true AND
 *                                ≥1 active Partner serves that city
 *                                (case-insensitive match on Partner.city)
 *
 * Source of truth for locations = active partner sync. A location page
 * without an active partner is excluded from the sitemap (no hardcoded
 * city list).
 *
 * Location dedup: locations are grouped by canonical city name
 * (canonicalCityName resolves legacy spellings, e.g. "Palangkaraya" →
 * "Palangka Raya"). Within a duplicate group the row whose slug IS the
 * canonical slug wins (e.g. /lokasi/palangka-raya), so legacy alias slugs
 * (e.g. /lokasi/palangkaraya) are never emitted. Solo rows (no duplicate)
 * are emitted unchanged so no real location page is dropped.
 *
 * lastmod policy: static routes have no content timestamp source, so their
 * entries OMIT <lastmod> entirely (a missing lastmod is preferable to a
 * fabricated one — never use request/build time). Blog and location
 * entries use their real database updatedAt.
 *
 * Excluded by design (never in sitemap):
 *   - /api/*, /login, /register, /dashboard, /owner/*, /partner/*
 *   - /maintenance, /track
 *   - Unpublished blog posts
 *   - Inactive locations
 *   - Active locations with zero active partners
 *
 * Failure contract (SITEMAP DELIVERY HARDENING):
 *   If ANY of the three DB queries throws, the error is logged as a
 *   structured JSON line (no credentials/PII) and then RETHROWN so the
 *   request fails explicitly (HTTP 500). We do NOT silently return a
 *   5-URL sitemap with HTTP 200 — that would mask the outage from
 *   uptime monitors AND cause Google Search Console to treat the
 *   previously-indexed /lokasi/* and /blog/* URLs as "stale" (vanishing
 *   from the sitemap). ISR cache (revalidate=3600) only applies to
 *   successful responses; an error is never cached for an hour.
 *
 * Why three queries (not one combined location query):
 *   Location <-> Partner has NO Prisma relation (Partner.city is a
 *   free-text String; Location has no FK to Partner). Combining the
 *   active-partner filter into the location query would require either
 *   a schema change (explicitly forbidden in this pass) or a
 *   case-insensitive `equals` that is unsafe across SQLite (dev) and
 *   PostgreSQL (prod). The 3-query approach is the safe, schema-stable
 *   path; dedup + partner-sync filter are applied in JS after the fetch.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes: no lastModified — see lastmod policy in the header
  // comment. Never fabricate a content timestamp with new Date().
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/order`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/faq`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/lokasi`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // SEO Batch 1 — service pillar pages. Self-canonical, indexable,
    // SSR-first, unique metadata, structured data via safeJsonLd().
    {
      url: `${SITE_URL}/pencairan-kartu-kredit`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/pencairan-paylater`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // DB queries are wrapped in try/catch only to attach a structured log
  // line; the error is then rethrown so the request fails explicitly.
  // See failure contract in the file header comment.
  try {
    const [blogPosts, locations, activePartners] = await Promise.all([
      db.blogPost.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true, featuredImage: true, title: true },
        orderBy: { updatedAt: 'desc' },
      }),
      db.location.findMany({
        where: { isActive: true },
        select: { slug: true, name: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      db.partner.findMany({
        where: { status: 'active' },
        select: { city: true },
      }),
    ]);

    // Source of truth: only include locations that have ≥1 active partner
    // serving that city (case-insensitive, trimmed match on Partner.city).
    const activeCities = new Set(
      activePartners
        .map((p) => p.city?.trim().toLowerCase())
        .filter((c): c is string => !!c),
    );

    // Next.js 16 MetadataRoute.Sitemap: `images` is `string[]` (URL strings
    // only). The framework serializer interpolates each entry directly into
    // `<image:loc>${image}</image:loc>`, so passing an object would render
    // as the literal text `[object Object]` (an invalid image URL that
    // Google Search Console rejects). Guard so only a real absolute
    // http(s) URL string is emitted; any other shape is skipped entirely
    // (the blog <url> entry itself is unaffected).
    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => {
      const entry: MetadataRoute.Sitemap[number] = {
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
      if (
        typeof post.featuredImage === 'string' &&
        post.featuredImage.trim() !== '' &&
        post.featuredImage !== '[object Object]' &&
        /^https?:\/\//i.test(post.featuredImage)
      ) {
        entry.images = [post.featuredImage];
      }
      return entry;
    });

    // Group surviving locations by CANONICAL city name so one city only
    // has one landing page entry, and legacy alias slugs are dropped when
    // the canonical-slug row exists in the same group.
    const cityGroups = new Map<
      string,
      Array<{ slug: string; name: string; updatedAt: Date }>
    >();
    for (const loc of locations) {
      if (!activeCities.has(loc.name.trim().toLowerCase())) continue;
      const key = canonicalCityName(loc.name).trim().toLowerCase();
      const bucket = cityGroups.get(key);
      if (bucket) bucket.push(loc);
      else cityGroups.set(key, [loc]);
    }

    const locationPages: MetadataRoute.Sitemap = [...cityGroups.values()].map(
      (rows) => {
        const canonicalSlug = normalizeSlug(canonicalCityName(rows[0].name));
        const canonicalRows = rows.filter(
          (r) => normalizeSlug(r.slug) === canonicalSlug,
        );
        // Exactly one canonical-slug row → legacy aliases (e.g.
        // /lokasi/palangkaraya) in this group are NOT emitted. Otherwise
        // fall back to the first row (newest updatedAt) — the previous
        // normalized-slug dedup behavior for exact duplicates.
        const chosen = canonicalRows.length === 1 ? canonicalRows[0] : rows[0];
        return {
          url: `${SITE_URL}/lokasi/${chosen.slug}`,
          lastModified: chosen.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        };
      },
    );

    return [...staticPages, ...blogPages, ...locationPages];
  } catch (error) {
    // SITEMAP DELIVERY HARDENING — structured log + rethrow.
    // No credentials/PII are logged. The error name + message are safe
    // to expose to Vercel logs. Rethrowing ensures the request fails
    // explicitly (HTTP 500) instead of silently degrading to a 5-URL
    // sitemap that would poison Google Search Console as "stale".
    console.error(JSON.stringify({
      level: 'error',
      event: 'sitemap.generation_failed',
      message: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
}
