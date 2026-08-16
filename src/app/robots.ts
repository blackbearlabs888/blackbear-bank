import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

/**
 * Robots policy — Black Bear
 *
 * Public, indexable content:
 *   /, /order, /track, /faq, /blog, /blog/<published-slug>, /lokasi, /lokasi/<active-slug>
 *
 * Never indexed (auth, personalized, dashboard, API, internal):
 *   /api/, /login, /register, /dashboard, /owner/, /partner/, /maintenance
 *
 * Trailing slash: Next.js App Router does not append trailing slashes by default.
 */
const DISALLOWED = [
  '/api/',
  '/login',
  '/register',
  '/dashboard',
  '/owner/',
  '/partner/',
  '/maintenance',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: DISALLOWED,
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
        disallow: DISALLOWED,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
