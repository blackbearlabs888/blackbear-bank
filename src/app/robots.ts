import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.id';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/owner/dashboard/',
          '/partner/dashboard/',
          '/register',
          '/dashboard/',
          '/maintenance',
          '/*?*', // Disallow URLs with query parameters
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/owner/',
          '/partner/',
          '/register',
          '/dashboard/',
          '/maintenance',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/api/',
          '/owner/',
          '/partner/',
          '/register',
          '/dashboard/',
          '/maintenance',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
