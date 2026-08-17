import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Headers Middleware
 *
 * Adds standard security headers to all responses.
 *
 * CSP (Content-Security-Policy-Report-Only):
 *   This is a BASELINE ONLY. It is set as Report-Only so it does not block
 *   anything (MapLibre, Google Fonts, TipTap, inline JSON-LD scripts, and
 *   inline styles all require permissive directives).
 *
 *   IMPORTANT: There is currently NO `report-uri` or `report-to` directive.
 *   Without a reporting endpoint, violations are NOT collected anywhere, so
 *   they cannot be reviewed. Do NOT claim that violations can be reviewed.
 *   Adding a reporting endpoint requires either a self-hosted collector or
 *   an external reporting service — both are out of scope for this phase and
 *   require product approval. Until then, this CSP serves only as a
 *   documented baseline of the intended policy; it must NOT be switched to
 *   enforced mode (Content-Security-Policy) until a reporting endpoint is
 *   in place and violations have been reviewed.
 */

// Permissive-but-improving CSP (Report-Only mode, BASELINE ONLY — no reporting endpoint)
// Allows: self, inline scripts/styles (JSON-LD, Next.js, TipTap),
// Google Fonts, MapLibre/CARTO tiles, Telegram API, images from any https
//
// NOTE: No `report-uri` / `report-to` directive is present. See header
// comment above.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://api.telegram.org https://*.basemaps.cartocdn.com https://tile.openstreetmap.org wss: ws:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https:",
].join('; ');

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // --- Enforced headers (low risk) ---
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), interest-cohort=()');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // --- HSTS: production HTTPS responses only ---
  // Detection mechanism: the `x-forwarded-proto` header is set by the
  // reverse proxy / edge network (Caddy in sandbox, Vercel's edge in prod)
  // to the protocol of the original client request. We only emit HSTS when
  // both NODE_ENV=production AND the request arrived over HTTPS, so HTTP
  // dev traffic and non-production environments never receive the header.
  //
  // NOTE: `includeSubDomains` and `preload` are intentionally OMITTED.
  //   - includeSubDomains would force HSTS on every subdomain (e.g. api.,
  //     www., staging., dev.) which have NOT been audited for HTTPS
  //     readiness. Enabling it without audit can render subdomains
  //     unreachable if they are HTTP-only.
  //   - preload would commit the domain to the HSTS preload list, which is
  //     irrevocable for months and requires includeSubDomains. The domain
  //     and all subdomains must be verified eligible before submitting.
  //   These can be re-enabled in a future phase after a subdomain audit.
  const isHttps = request.headers.get('x-forwarded-proto') === 'https';
  if (process.env.NODE_ENV === 'production' && isHttps) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000'
    );
  }

  // --- CSP: Report-Only (does not block — review violations before enforcing) ---
  response.headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);

  return response;
}

export const config = {
  // Run on all routes except static assets, Next.js internals, and
  // metadata routes (robots.txt + sitemap.xml) that should reach the
  // metadata route handler directly without an Edge middleware hop.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|logo.png|manifest.json|robots.txt|sitemap.xml).*)',
  ],
};
