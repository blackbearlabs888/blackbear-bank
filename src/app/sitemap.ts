import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { normalizeSlug } from '@/lib/slug-utils';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

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
 * Slug dedup: locations are deduplicated by normalized slug so that one
 * city only has one landing page, even if duplicate rows exist.
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
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/order`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/lokasi`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
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

    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      ...(post.featuredImage
        ? {
            images: [
              {
                loc: post.featuredImage,
                title: post.title,
              },
            ],
          }
        : {}),
    }));

    // Deduplicate by normalized slug so one city only has one landing page.
    const seenSlugs = new Set<string>();
    const locationPages: MetadataRoute.Sitemap = locations
      .filter((loc) => activeCities.has(loc.name.trim().toLowerCase()))
      .filter((loc) => {
        const normalized = normalizeSlug(loc.slug);
        if (seenSlugs.has(normalized)) return false;
        seenSlugs.add(normalized);
        return true;
      })
      .map((loc) => ({
        url: `${siteUrl}/lokasi/${loc.slug}`,
        lastModified: loc.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

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
