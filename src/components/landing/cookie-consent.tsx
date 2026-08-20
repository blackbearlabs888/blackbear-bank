'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Cookie, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dispatchCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';
import {
  setConsentGranted,
  setConsentDenied,
  CONSENT_STORAGE_KEY,
} from '@/lib/analytics/consent';

// Check localStorage (safe because component is ssr: false).
// Reuses the existing `cookie-consent` storage key — backward-compatible with
// users who already accepted/rejected in a prior session.
function getInitialVisibility(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(CONSENT_STORAGE_KEY);
}

// Only show on public pages: landing, blog, lokasi, FAQ, pencairan-* pillar routes
// (SEO Batch 1 QA correction #1: extend coverage to /pencairan-kartu-kredit
//  and /pencairan-paylater so GA4 consent + conversion attribution works for
//  visitors landing directly on the pillars from Google. Consent semantics
//  unchanged — only the predicate list is extended.)
function isPublicPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/' ||
    pathname === '/faq' ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/lokasi') ||
    pathname.startsWith('/pencairan-')
  );
}

export default function CookieConsent() {
  const pathname = usePathname();

  // Only show on public pages
  const isPublic = isPublicPage(pathname);

  // Initialize from localStorage directly — no useEffect needed for initial state
  const [isVisible, setIsVisible] = useState(getInitialVisibility);

  // Dispatch visibility state for other components (whatsapp-fab, scroll-to-top, etc.)
  // Only dispatch when cookie banner is actually visible AND on a public page
  useEffect(() => {
    if (isVisible && isPublic) {
      dispatchCookieBannerVisible(true);
    }
  }, [isVisible, isPublic]);

  const handleClose = () => {
    // Persist denied consent. Reuses the existing `cookie-consent`
    // localStorage key (backward-compatible) and dispatches a same-tab
    // change event so the AnalyticsProvider can ensure gtag.js stays
    // unloaded. AnalyticsProvider subscribes via subscribeToConsentChanges.
    setConsentDenied();
    setIsVisible(false);
    dispatchCookieBannerVisible(false);
  };

  const handleAccept = () => {
    // Persist granted consent. Reuses the existing `cookie-consent`
    // localStorage key (backward-compatible) and dispatches a same-tab
    // change event so the AnalyticsProvider can initialize gtag.js,
    // dataLayer, and call gtag('config', measurementId).
    setConsentGranted();
    setIsVisible(false);
    dispatchCookieBannerVisible(false);
  };

  if (!isVisible || !isPublic) return null;

  return (
    <>
      {/* Mobile: floating bottom bar above mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none md:hidden">
        <div className="pointer-events-auto">
          <div className="mx-3 mb-[73px] max-w-lg safe-area-bottom">
            <div className="relative bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/10 p-4">
              {/* Glow */}
              <div className="absolute -inset-px bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-primary/10 rounded-2xl -z-10 blur-sm" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-2.5 right-2.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex gap-3 items-start">
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-4.5 h-4.5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-sm font-bold mb-1">Kami menggunakan cookies</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                    Untuk meningkatkan pengalaman Anda. Dengan melanjutkan, Anda menyetujui kebijakan cookie kami.
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleAccept}
                      size="sm"
                      className="gradient-primary text-white rounded-xl h-10 px-4 text-xs font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Terima Semua
                    </Button>
                    <Button
                      onClick={handleClose}
                      variant="ghost"
                      size="sm"
                      className="rounded-xl h-10 px-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: floating bottom-right card */}
      <div className="hidden md:block fixed bottom-6 right-6 z-[60] pointer-events-none">
        <div className="pointer-events-auto">
          <div className="relative w-80 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/10 p-5">
            {/* Glow */}
            <div className="absolute -inset-px bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-primary/10 rounded-2xl -z-10 blur-sm" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex gap-3.5 items-start">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-5">
                <h3 className="text-sm font-bold mb-1">Kami menggunakan cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3.5">
                  Untuk meningkatkan pengalaman Anda. Dengan melanjutkan, Anda menyetujui kebijakan cookie kami.
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAccept}
                    size="sm"
                    className="gradient-primary text-white rounded-xl h-9 px-4 text-xs font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98]"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Terima Semua
                  </Button>
                  <Button
                    onClick={handleClose}
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Tolak
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
