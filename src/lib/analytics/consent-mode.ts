/**
 * Consent Mode v2 Commands — Direct GA4
 * ===========================================================================
 *
 * Issues the explicit `gtag('consent', 'default' | 'update', {...})` commands
 * that Google Consent Mode v2 requires. These commands tell gtag.js (when it
 * loads) the user's consent state for each of the four storage types:
 *
 *   ad_storage          — cookies for advertising
 *   analytics_storage   — cookies for analytics (GA4)
 *   ad_user_data        — sending user data to Google for advertising
 *   ad_personalization  — personalized advertising
 *
 * Contract (per owner directive — explicit Consent Mode v2):
 *
 *   1. On provider mount (before any user action):
 *        applyConsentDefault()
 *        → gtag('consent', 'default', { all four: 'denied' })
 *      This MUST be the FIRST gtag command — it sets the baseline so that
 *      when gtag.js eventually loads, it knows consent is denied by default
 *      and suppresses all GA requests until an 'update' grants storage.
 *
 *   2. On user Accept:
 *        applyConsentGranted()
 *        → gtag('consent', 'update', {
 *            ad_storage: 'denied',
 *            analytics_storage: 'granted',   ← ONLY this one
 *            ad_user_data: 'denied',
 *            ad_personalization: 'denied',
 *          })
 *      Accept grants ONLY analytics_storage. The other three stay denied
 *      (we do not run ads, so ad_* storage is never granted).
 *      This command MUST precede gtag('config', ...) — the provider calls
 *      applyConsentGranted() before gtag('config') in the same effect.
 *
 *   3. On user Reject:
 *        applyConsentDenied()
 *        → gtag('consent', 'update', { all four: 'denied' })
 *      Explicit all-denied update. Handles the edge case where the user
 *      previously accepted (analytics_storage was 'granted') and then
 *      rejected — this flips analytics_storage back to 'denied'.
 *
 * Invariants:
 *   - No request to googletagmanager.com before Accept. The gtag.js
 *     <Script> is rendered ONLY when consent === 'granted' (see
 *     AnalyticsProvider). These consent commands queue into the local
 *     dataLayer stub without loading any external script.
 *   - Consent command precedes config and every analytics event. The
 *     provider calls applyConsentDefault() in a mount effect (Effect 1),
 *     applyConsentGranted() before gtag('config') (Effect 2), and
 *     applyConsentDenied() in a deny effect (Effect 3). trackEvent() only
 *     fires after consent is 'granted' (isAnalyticsEnabled gate), so every
 *     event is preceded by the consent default + granted update.
 *
 * Browser-only. No-op on server. No-op if window.gtag is not yet defined
 * (the provider's mount effect initializes the stub before calling these).
 *
 * Scope lock: only issues consent commands. Does NOT touch sitemap,
 * transaction formula, fraud, auth, Prisma schema, or UI. Does NOT change
 * event call sites (trackEvent / order / register / rate-calculator / FAB).
 */

/**
 * The four Consent Mode v2 storage types. Google requires exactly these
 * keys; any other key in a consent command is silently ignored by gtag.js.
 */
export const CONSENT_TYPES = [
  'ad_storage',
  'analytics_storage',
  'ad_user_data',
  'ad_personalization',
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

/**
 * Default consent state — ALL FOUR denied. Set on mount via
 * applyConsentDefault() BEFORE any user action, config, or event.
 *
 * This is the Consent Mode v2 "default denied" baseline. When gtag.js
 * loads and processes this command, it knows not to fire any GA request
 * until an 'update' grants a storage type.
 */
export const CONSENT_DEFAULT_DENIED: Record<ConsentType, 'denied'> = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

/**
 * Granted consent state — ONLY analytics_storage granted.
 *
 * ad_storage, ad_user_data, ad_personalization remain 'denied' because
 * we do not run advertising. This is the "Accept grants only
 * analytics_storage" requirement from the owner directive.
 *
 * Used by applyConsentGranted() on user Accept. MUST precede
 * gtag('config', ...).
 */
export const CONSENT_GRANTED_ANALYTICS_ONLY: Record<
  ConsentType,
  'denied' | 'granted'
> = {
  ad_storage: 'denied',
  analytics_storage: 'granted',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

/**
 * All-denied consent state for the explicit Reject update.
 *
 * Semantically identical to CONSENT_DEFAULT_DENIED, but issued via
 * 'update' (not 'default') to flip a previously-granted analytics_storage
 * back to 'denied' when the user rejects after accepting.
 */
export const CONSENT_ALL_DENIED: Record<ConsentType, 'denied'> = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

/**
 * Issue `gtag('consent', 'default', { all four denied })`.
 *
 * MUST be the FIRST consent command — called by the provider's mount
 * effect (Effect 1) before any config or event. This sets the baseline
 * consent state so gtag.js (when it loads on Accept) knows the default
 * is fully denied.
 *
 * No-op on server. No-op if window.gtag is not yet a function (the
 * provider's mount effect initializes the stub before calling this; if
 * called out of order, it silently no-ops rather than throwing).
 */
export function applyConsentDefault(): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('consent', 'default', CONSENT_DEFAULT_DENIED);
  } catch {
    // gtag may throw if GA hasn't fully initialized — silent no-op so
    // a transient gtag error never breaks the page.
  }
}

/**
 * Issue `gtag('consent', 'update', { analytics_storage: 'granted', ... })`.
 *
 * Called when the user accepts. Grants ONLY analytics_storage; the other
 * three storage types (ad_storage, ad_user_data, ad_personalization)
 * remain 'denied' because we do not run advertising.
 *
 * MUST precede `gtag('config', ...)` — the provider calls this in the
 * consent-granted effect (Effect 2) BEFORE the config call, so gtag.js
 * processes the consent update before the config (which would otherwise
 * trigger GA requests under the default-denied state).
 *
 * No-op on server. No-op if window.gtag is not yet a function.
 */
export function applyConsentGranted(): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('consent', 'update', CONSENT_GRANTED_ANALYTICS_ONLY);
  } catch {
    // silent no-op
  }
}

/**
 * Issue `gtag('consent', 'update', { all four denied })`.
 *
 * Called when the user rejects. Explicitly sets all four storage types to
 * 'denied'. This handles the edge case where the user previously accepted
 * (analytics_storage was 'granted') and then rejected — the update flips
 * analytics_storage back to 'denied'.
 *
 * No-op on server. No-op if window.gtag is not yet a function.
 */
export function applyConsentDenied(): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('consent', 'update', CONSENT_ALL_DENIED);
  } catch {
    // silent no-op
  }
}
