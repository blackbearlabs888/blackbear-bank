import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

/**
 * Sitemap — only public, active, indexable content is listed.
 *
 * Excluded by design:
 *   - /api/* (not for indexing)
 *   - /login, /register (auth pages)
 *   - /dashboard, /owner/*, /partner/* (personalized / authenticated)
 *   - /maintenance (operational, not content)
 *   - Unpublished blog posts
 *   - Inactive locations
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
      url: `${siteUrl}/track`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
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
    const [blogPosts, locations] = await Promise.all([
      db.blogPost.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true, featuredImage: true, title: true },
        orderBy: { updatedAt: 'desc' },
      }),
      db.location.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

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

    const locationPages: MetadataRoute.Sitemap = locations.map((location) => ({
      url: `${siteUrl}/lokasi/${location.slug}`,
      lastModified: location.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...blogPages, ...locationPages];
  } catch {
    // Database unavailable — return static public pages only.
    return staticPages;
  }
}
