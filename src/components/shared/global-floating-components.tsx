'use client';

import dynamic from 'next/dynamic';

const SocialProofToast = dynamic(
  () => import('@/components/landing/social-proof-toast'),
  { ssr: false, loading: () => null }
);

const CookieConsent = dynamic(
  () => import('@/components/landing/cookie-consent'),
  { ssr: false, loading: () => null }
);

export default function GlobalFloatingComponents() {
  return (
    <>
      <SocialProofToast />
      <CookieConsent />
    </>
  );
}
