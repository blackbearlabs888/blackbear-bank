'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dispatchCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

// Check localStorage (safe because component is ssr: false)
function getInitialVisibility(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem('cookie-consent');
}

export default function CookieConsent() {
  // Initialize from localStorage directly — no useEffect needed for initial state
  const [isVisible, setIsVisible] = useState(getInitialVisibility);
  const [isAnimated, setIsAnimated] = useState(false);

  // Trigger entrance animation after mount
  useEffect(() => {
    if (isVisible) {
      const timer = requestAnimationFrame(() => setIsAnimated(true));
      return () => cancelAnimationFrame(timer);
    }
  }, [isVisible]);

  // Dispatch visibility state for other components (whatsapp-fab, footer, etc.)
  useEffect(() => {
    if (isVisible) {
      dispatchCookieBannerVisible(true);
    }
  }, [isVisible]);

  const handleClose = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setIsVisible(false);
    dispatchCookieBannerVisible(false);
  };

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    setIsVisible(false);
    dispatchCookieBannerVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Mobile: floating bottom bar above mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none md:hidden">
        <div className="pointer-events-auto">
          <div className={`mx-3 mb-[73px] max-w-lg safe-area-bottom transition-all duration-500 ease-out ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
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
        <div className={`pointer-events-auto transition-all duration-500 ease-out ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
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
