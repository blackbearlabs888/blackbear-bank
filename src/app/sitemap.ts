import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { normalizeSlug } from '@/lib/slug-utils';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

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
 * If the database is unavailable, we still emit the static public pages so
 * crawlers receive a valid sitemap rather than a 500.
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
  } catch {
    // Database unavailable — return static public pages only.
    return staticPages;
  }
}
