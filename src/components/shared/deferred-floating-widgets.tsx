'use client';

import dynamic from 'next/dynamic';

/**
 * Homepage Mobile Performance correction: client wrapper that defers the
 * below-fold / interaction-only floating widgets (WhatsAppFab + ScrollToTop)
 * out of the main client bundle of every route.
 *
 * `next/dynamic` with `ssr: false` is not allowed in Server Components, so
 * this thin client component sits between `layout.tsx` (server) and the two
 * widgets. Both widgets already delay their own visibility via timers
 * (WhatsAppFab: 1.2 s setTimeout; ScrollToTop: scroll > 2 % gate), so users
 * see no flicker — they just don't pay the bundle cost on first paint.
 */
const WhatsAppFab = dynamic(
  () => import('@/components/landing/whatsapp-fab'),
  { ssr: false, loading: () => null }
);

const ScrollToTop = dynamic(
  () => import('@/components/landing/scroll-to-top'),
  { ssr: false, loading: () => null }
);

export default function DeferredFloatingWidgets() {
  return (
    <>
      <ScrollToTop />
      <WhatsAppFab />
    </>
  );
}
