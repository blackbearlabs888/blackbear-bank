/**
 * trackEvent — Browser-Only Conversion Event Helper (Direct GA4)
 * ===========================================================================
 *
 * Requirements honored (per owner directive — DIRECT GA4 + CONVERSION
 * TRACKING):
 *
 *   - Browser-only. No-op on server (typeof window === 'undefined').
 *   - No-op if NEXT_PUBLIC_GA_MEASUREMENT_ID is absent or malformed
 *     (graceful — dev environments without the env var don't crash or fire).
 *   - No-op if consent is 'denied' or 'pending' (Consent Mode v2 enforced
 *     at the call site, not just at script-load time).
 *   - PII allowlist enforced via sanitizeParams() — any key outside
 *     {page_path, page_type, service_type, provider, city, amount_bucket}
 *     is dropped before any dataLayer.push.
 *   - Provider / city / service_type values normalized (slug-ish lowercase).
 *   - Never logs PII: name, phone, email, bank/bankAccount/bankHolder,
 *     exact nominal, WA message text, WA URL, orderId, transactionId,
 *     idempotency key, customer ID, address — all stripped by allowlist.
 *
 * Events (per directive):
 *   click_wa                     — on real WhatsApp navigation (NOT article share)
 *   use_calculator               — after explicit "Hitung Estimasi" click
 *   generate_lead                — after server confirms order success
 *   partner_registration_success — after server confirms partner registration
 *
 * For server-confirmed conversions, call this DIRECTLY after the server
 * success branch (in the same tick as the success handler), NOT in a
 * useEffect — the directive requires the event to fire before redirect,
 * in the same call stack as the success confirmation.
 *
 * Scope lock: this module only sends events to GA4. It does NOT touch
 * sitemap, transaction formula, fraud, auth, Prisma schema, or UI.
 */

import { getConsentState } from './consent';
import { sanitizeParams } from './buckets';

declare global {
  interface Window {
    /** GA4 / GTM dataLayer. Initialized by AnalyticsProvider on consent grant. */
    dataLayer?: unknown[];
    /** gtag() function. Initialized by AnalyticsProvider on consent grant. */
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Read the GA4 measurement id from env. Returns null if absent or malformed
 * so callers can no-op gracefully. NEXT_PUBLIC_ prefix means Next.js inlines
 * this at build time and it's available on both server and client.
 *
 * NEVER hardcode the id in source — only ever read from env.
 */
export function getMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  // Defensive: must look like G-XXXXXXXXXX (G- + at least 4 alphanumerics)
  if (!/^G-[A-Z0-9]{4,}$/i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Is GA4 enabled RIGHT NOW? True only when:
 *   (a) running in a browser (typeof window !== 'undefined'),
 *   (b) env var NEXT_PUBLIC_GA_MEASUREMENT_ID is present and well-formed,
 *   (c) user has granted consent.
 * Everything else = no-op (no event, no dataLayer push, no network call).
 */
export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (!getMeasurementId()) return false;
  return getConsentState() === 'granted';
}

/**
 * Push a conversion event to GA4 via the gtag() / dataLayer interface.
 *
 * Behavior:
 *   - Server-side             → no-op (returns immediately).
 *   - No measurement id env    → no-op.
 *   - Consent pending/denied  → no-op (no event queued, no dataLayer growth).
 *   - Consent granted         → push to dataLayer AND call gtag('event', ...).
 *
 * Params are PII-stripped + normalized via sanitizeParams before push.
 * The raw input object is NEVER persisted or referenced after this call.
 */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;
  // Reject empty / non-string / whitespace-only event names defensively.
  if (!name || typeof name !== 'string' || !name.trim()) return;
  if (!isAnalyticsEnabled()) return;

  const safeParams = sanitizeParams(params);

  // Defensive: ensure dataLayer exists. AnalyticsProvider normally sets this
  // up on consent grant, but trackEvent can be called from anywhere (e.g.
  // a component mounted before the provider's effect ran) — make it safe.
  if (!Array.isArray(window.dataLayer)) window.dataLayer = [];

  // Call gtag() if it's defined (provider has initialized it on consent
  // grant). This is the canonical direct-GA4 path. gtag() pushes to
  // dataLayer internally, which gtag.js processes.
  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', name, safeParams);
      return;
    } catch {
      // gtag may throw if GA hasn't fully initialized — fall through to
      // direct dataLayer.push so the event survives.
    }
  }

  // Fallback: push as a GTM-style event object. gtag.js processes this
  // format too, so the event survives even without a gtag() stub.
  window.dataLayer.push({ event: name, ...safeParams });
}
