/**
 * Analytics Consent — Basic Consent Mode v2
 * ===========================================================================
 *
 * Reuses the EXISTING `cookie-consent` localStorage key for backward
 * compatibility. Users who already accepted/rejected before this module
 * shipped will have their prior choice honored automatically — no banner
 * re-show, no consent reset, no orphaned storage entries.
 *
 * Storage shape (UNCHANGED from src/components/landing/cookie-consent.tsx):
 *   localStorage['cookie-consent'] = JSON.stringify({ accepted: boolean, date: ISO })
 *
 * Consent state model:
 *   'granted'  — user accepted    → GA4 loads, events fire
 *   'denied'   — user rejected    → GA4 never loads, trackEvent is no-op
 *   'pending'  — no choice yet    → banner visible, GA4 not loaded, trackEvent is no-op
 *
 * Browser-only module. Safe to import from client components / hooks.
 * Must NOT be imported by server components / API routes (no window access).
 *
 * Scope lock: this module only manages consent state. It does NOT touch
 * sitemap, transaction formula, fraud, auth, Prisma schema, or UI.
 */

export type ConsentState = 'granted' | 'denied' | 'pending';

/** The single localStorage key the cookie banner has always used. */
export const CONSENT_STORAGE_KEY = 'cookie-consent';

/** Custom event name broadcast on consent changes (same-tab). */
const CONSENT_EVENT_NAME = 'blackbear:consent-change';

interface StoredConsent {
  accepted?: boolean;
  date?: string;
}

/**
 * Read consent state from localStorage. SSR-safe.
 * Returns 'pending' on the server, when storage is missing, when the entry
 * is malformed, or when privacy mode blocks localStorage access.
 */
export function getConsentState(): ConsentState {
  if (typeof window === 'undefined') return 'pending';
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return 'pending';
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed && typeof parsed.accepted === 'boolean') {
      return parsed.accepted ? 'granted' : 'denied';
    }
    return 'pending';
  } catch {
    return 'pending';
  }
}

/**
 * Persist consent = granted. Emits a same-tab change event so the
 * AnalyticsProvider can load gtag.js and call gtag('config', measurementId).
 *
 * Backward-compatible: writes the SAME shape cookie-consent.tsx has always
 * written ({ accepted, date }) so existing readers (e.g. the banner
 * visibility hook) keep working unchanged.
 */
export function setConsentGranted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ accepted: true, date: new Date().toISOString() }),
    );
    window.dispatchEvent(
      new CustomEvent<ConsentState>(CONSENT_EVENT_NAME, { detail: 'granted' }),
    );
  } catch {
    // localStorage may be unavailable (Safari private mode, quota) — silent no-op.
  }
}

/**
 * Persist consent = denied. Emits a same-tab change event so the
 * AnalyticsProvider can ensure gtag.js is NOT loaded (and any in-memory
 * state is cleared on next mount).
 */
export function setConsentDenied(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ accepted: false, date: new Date().toISOString() }),
    );
    window.dispatchEvent(
      new CustomEvent<ConsentState>(CONSENT_EVENT_NAME, { detail: 'denied' }),
    );
  } catch {
    // silent no-op
  }
}

/**
 * Subscribe to consent changes (same-tab via custom event, cross-tab via
 * storage event). Returns an unsubscribe function.
 *
 * Use this from the AnalyticsProvider to react when the cookie banner
 * accepts or rejects — typically loading or not loading gtag.js.
 */
export function subscribeToConsentChanges(
  cb: (state: ConsentState) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ConsentState>).detail;
    cb(detail ?? getConsentState());
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === CONSENT_STORAGE_KEY) cb(getConsentState());
  };
  window.addEventListener(CONSENT_EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(CONSENT_EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
