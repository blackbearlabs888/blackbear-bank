import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc';

  // Static pages - all public-facing pages
  const getStaticPages = (): MetadataRoute.Sitemap => [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/order`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/track`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/lokasi`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  try {
    // Fetch dynamic content
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

    // Blog post pages with featured images
    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      ...(post.featuredImage ? {
        images: [{
          loc: post.featuredImage,
          title: post.title,
        }],
      } : {}),
    }));

    // Location pages
    const locationPages: MetadataRoute.Sitemap = locations.map((location) => ({
      url: `${siteUrl}/lokasi/${location.slug}`,
      lastModified: location.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...getStaticPages(), ...blogPages, ...locationPages];
  } catch (error) {
    console.error('Sitemap error:', error);
    return getStaticPages();
  }
}
