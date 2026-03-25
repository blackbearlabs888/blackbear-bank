import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.id';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get dynamic content
  let announcements: Array<{ id: string; updatedAt: Date }> = [];
  
  try {
    announcements = await db.announcement.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    });
  } catch (error) {
    console.error('Failed to fetch announcements for sitemap:', error);
  }

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/order`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/track`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/partner/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/owner/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ];

  // Announcement pages (if you have public announcement pages)
  const announcementPages: MetadataRoute.Sitemap = announcements.map((announcement) => ({
    url: `${siteUrl}/announcement/${announcement.id}`,
    lastModified: announcement.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...announcementPages];
}
