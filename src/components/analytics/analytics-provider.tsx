'use client';

/**
 * AnalyticsProvider — Direct GA4 Tag Loader + Consent Mode v2 + Page-View
 * ===========================================================================
 *
 * Mounted ONCE in src/app/layout.tsx as the first child of <body>.
 *
 * Three-effect Consent Mode v2 architecture:
 *
 *   Effect 1 (mount, runs ONCE regardless of consent):
 *     - Initialize window.dataLayer + window.gtag stub (WITHOUT loading the
 *       external Google script — the <Script> is only rendered on grant).
 *     - Issue gtag('consent', 'default', { all four: 'denied' }) — the
 *       FIRST gtag command, setting the Consent Mode v2 baseline so gtag.js
 *       (when it loads) knows consent is denied by default.
 *
 *   Effect 2 (consent === 'granted', runs ONCE):
 *     - Issue gtag('consent', 'update', { analytics_storage: 'granted',
 *       others: 'denied' }) — Accept grants ONLY analytics_storage. This
 *       consent command MUST precede gtag('config') (Consent Mode v2
 *       requirement: consent command precedes config and every event).
 *     - gtag('js', new Date()) — GA4 session timestamp.
 *     - gtag('config', measurementId, { send_page_view: false }) — disable
 *       GA's auto page_view so we fire it ourselves (no App Router dup).
 *     - Render the gtag.js <Script> (strategy="afterInteractive") so the
 *       external googletagmanager.com request happens ONLY after Accept.
 *
 *   Effect 3 (consent === 'denied'):
 *     - Issue gtag('consent', 'update', { all four: 'denied' }) — explicit
 *       Reject. Handles the accept→reject edge case: flips analytics_storage
 *       back to 'denied' after it was previously granted.
 *
 * Responsibilities (continued):
 *   4. Provide a SINGLE page_view mechanism: useEffect on
 *      [gaLoaded, measurementId, pathname] fires page_view exactly once per
 *      pathname. Covers BOTH initial load (gaLoaded flips true) AND client
 *      navigation (pathname change). The lastPageViewPath ref dedupes.
 *
 * State management:
 *   - consent: read via useSyncExternalStore over consent module (no
 *     setState-in-effect; reacts to cookie banner accept/reject).
 *   - gaLoaded: read via useSyncExternalStore over a module-level init flag
 *     (no setState-in-effect; the init effect just flips the flag and
 *     notifies listeners).
 *
 * Provider choice: Direct GA4 (no GTM), per owner directive.
 * Measurement ID: read from NEXT_PUBLIC_GA_MEASUREMENT_ID env var (NEVER
 * hardcoded — see src/lib/analytics/track.ts).
 *
 * Scope lock: this component only manages GA4 script loading + Consent Mode
 * v2 commands + page_view tracking. It does NOT touch sitemap, transaction
 * formula, fraud, auth, Prisma schema, or UI visual. It does NOT change
 * event call sites (trackEvent / order / register / rate-calculator / FAB).
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import {
  getConsentState,
  subscribeToConsentChanges,
  type ConsentState,
} from '@/lib/analytics/consent';
import { getMeasurementId } from '@/lib/analytics/track';
import {
  applyConsentDefault,
  applyConsentGranted,
  applyConsentDenied,
} from '@/lib/analytics/consent-mode';

/**
 * Module-level flag — guards the mount effect (Effect 1) against double-init
 * on HMR / provider re-mount. Without this, dev-mode hot reloads would
 * re-init window.dataLayer, re-define window.gtag, and re-issue
 * gtag('consent', 'default', ...) — generating duplicate consent defaults.
 */
let consentDefaultsInitialized = false;

/**
 * Module-level flag — guards the consent-granted effect (Effect 2) against
 * double-init on HMR / provider re-mount. Without this, dev-mode hot
 * reloads would re-call gtag('config', ...) — generating duplicate config
 * hits. Note: Effect 3 (consent-denied) is intentionally NOT guarded by
 * this flag — it must re-run when consent transitions granted→denied to
 * flip analytics_storage back to 'denied'.
 */
let moduleInitialized = false;

/**
 * Listener set for the GA-init external store. The init effect flips
 * moduleInitialized and calls notifyGaInit() — useSyncExternalStore picks
 * up the change and re-renders the provider so gaLoaded=true.
 */
const gaInitListeners = new Set<() => void>();
function notifyGaInit(): void {
  gaInitListeners.forEach((cb) => cb());
}
function subscribeGaInit(cb: () => void): () => void {
  gaInitListeners.add(cb);
  return () => gaInitListeners.delete(cb);
}
function getGaInitSnapshot(): boolean {
  return moduleInitialized;
}
function getGaInitServerSnapshot(): boolean {
  return false;
}

/**
 * useSyncExternalStore bindings for consent state. getConsentState is the
 * snapshot; subscribeToConsentChanges is the subscription. The server
 * snapshot returns 'pending' (no localStorage on server).
 */
function subscribeConsent(cb: () => void): () => void {
  return subscribeToConsentChanges(() => cb());
}
function getConsentSnapshot(): ConsentState {
  return getConsentState();
}
function getConsentServerSnapshot(): ConsentState {
  return 'pending';
}

export function AnalyticsProvider(): JSX.Element | null {
  const measurementId = getMeasurementId();
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const gaLoaded = useSyncExternalStore(
    subscribeGaInit,
    getGaInitSnapshot,
    getGaInitServerSnapshot,
  );
  /** Tracks the last pathname we fired a page_view for — prevents dupes. */
  const lastPageViewPath = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // Effect 1: Mount — initialize dataLayer + gtag stub + Consent Mode v2
  // default (ALL FOUR denied). Runs ONCE regardless of consent state.
  // This is the FIRST gtag command — it MUST precede config and every
  // analytics event. The external gtag.js script is NOT loaded here (it
  // only renders on consent grant below), so no googletagmanager.com
  // request happens before Accept.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!measurementId) return;
    if (consentDefaultsInitialized) return;
    consentDefaultsInitialized = true;

    // Initialize dataLayer FIRST (before any gtag command) so queued
    // commands are captured when gtag.js processes the dataLayer on init.
    window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];

    // Define gtag stub if not yet defined. The real gtag.js library
    // overrides window.gtag with its own implementation after loading.
    if (typeof window.gtag !== 'function') {
      window.gtag = function (...args: unknown[]) {
        // Standard gtag stub: push args-array to dataLayer.
        window.dataLayer!.push(args);
      };
    }

    // Consent Mode v2: default all four storage types to 'denied'. This is
    // the Consent Mode v2 baseline — the FIRST gtag command, preceding any
    // config or event. See src/lib/analytics/consent-mode.ts.
    applyConsentDefault();
  }, [measurementId]);

  // -------------------------------------------------------------------------
  // Effect 2: Consent === 'granted' — Consent Mode v2 update (analytics ONLY)
  // + gtag('js') + gtag('config'). Runs ONCE (guarded by moduleInitialized).
  // The consent update MUST precede gtag('config') so gtag.js processes the
  // granted analytics_storage before the config (which would otherwise run
  // under the default-denied state).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (consent !== 'granted') return;
    if (!measurementId) return;
    if (moduleInitialized) return;
    moduleInitialized = true;

    // Consent Mode v2: Accept grants ONLY analytics_storage. ad_storage,
    // ad_user_data, ad_personalization remain 'denied' (we do not run ads).
    // This consent command MUST precede gtag('config') below — gtag.js
    // processes the dataLayer in order, so the update is applied first.
    applyConsentGranted();

    // gtag('js', new Date()) — sets the GA4 session timestamp.
    window.gtag('js', new Date());

    // gtag('config', id, { send_page_view: false }) — disable GA's auto
    // page_view on config. We fire page_view manually below to guarantee
    // exactly one per route (no App Router duplicate).
    window.gtag('config', measurementId, { send_page_view: false });

    // Notify the GA-init external store — useSyncExternalStore re-renders
    // the provider with gaLoaded=true so the page_view effect fires.
    notifyGaInit();
  }, [consent, measurementId]);

  // -------------------------------------------------------------------------
  // Effect 3: Consent === 'denied' — Consent Mode v2 update (ALL denied).
  // Explicit reject. NOT guarded by moduleInitialized because this MUST
  // re-run when consent transitions granted→denied (to flip
  // analytics_storage back to 'denied' after it was previously granted).
  // Idempotent: re-issuing all-denied is harmless.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (consent !== 'denied') return;
    if (!measurementId) return;
    // Wait for the mount effect (Effect 1) to have initialized the gtag
    // stub. If Effect 1 hasn't run yet (shouldn't happen — React runs
    // effects in declaration order), no-op gracefully.
    if (!consentDefaultsInitialized) return;
    if (typeof window.gtag !== 'function') return;

    // Consent Mode v2: explicit all-denied update. Handles the
    // accept→reject edge case. See src/lib/analytics/consent-mode.ts.
    applyConsentDenied();
  }, [consent, measurementId]);

  // SINGLE page_view mechanism. Fires exactly once per pathname after
  // GA is loaded. Covers initial load (gaLoaded flips true → effect fires)
  // AND client-side navigation (pathname changes → effect fires).
  useEffect(() => {
    if (!gaLoaded || !measurementId) return;
    if (!pathname) return;
    // Dedup: don't refire for the same path (re-render safety).
    if (lastPageViewPath.current === pathname) return;
    lastPageViewPath.current = pathname;
    const page_location =
      typeof window !== 'undefined' ? window.location.href : '';
    const page_title =
      typeof document !== 'undefined' ? document.title : '';
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'page_view', {
          page_path: pathname,
          page_location,
          page_title,
          send_to: measurementId,
        });
      } catch {
        // If gtag throws (rare — GA still loading), queue as GTM-style
        // event object so it survives.
        if (Array.isArray(window.dataLayer)) {
          window.dataLayer.push({ event: 'page_view', page_path: pathname });
        }
      }
    }
  }, [gaLoaded, measurementId, pathname]);

  // No env var → nothing to render. Dev environments without the env var
  // never load GA4 — silent no-op, no console errors.
  if (!measurementId) return null;

  // Consent not granted → render NOTHING. No gtag.js script, no GA
  // network requests. Consent Mode v2 default-denied behavior.
  // The googletagmanager.com <Script> below is rendered ONLY when consent
  // === 'granted' — so no request to googletagmanager.com before Accept.
  if (consent !== 'granted') return null;

  // Consent granted → render the gtag.js loader script. next/script with
  // afterInteractive strategy defers load until after hydration so it
  // never blocks first paint.
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
}
