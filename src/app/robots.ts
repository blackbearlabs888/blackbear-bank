import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

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
          '/login',
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
          '/login',
        ],
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
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
          '/login',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
