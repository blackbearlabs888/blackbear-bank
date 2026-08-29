import { MetadataRoute } from 'next';

// Canonical host fallback. Production must set NEXT_PUBLIC_SITE_URL; the
// fallback below matches the canonical www host so a missing env var can
// never emit a non-canonical (apex) sitemap URL in robots.txt.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc';

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
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
