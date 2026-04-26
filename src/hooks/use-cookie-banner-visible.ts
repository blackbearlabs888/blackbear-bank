'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';

// Simple cross-component state management for cookie banner visibility
// Components can dispatch/listen to window events to coordinate

const listeners = new Set<() => void>();

// Initialize synchronously from localStorage BEFORE any component reads the snapshot.
// This fixes the race condition where WhatsAppFab/ScrollToTop mount before
// CookieConsent's useEffect dispatches the visibility state.
if (typeof window !== 'undefined' && window.__cookieBannerVisible === undefined) {
  window.__cookieBannerVisible = !localStorage.getItem('cookie-consent');
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function dispatchCookieBannerVisible(visible: boolean) {
  if (typeof window !== 'undefined') {
    window.__cookieBannerVisible = visible;
    window.dispatchEvent(new CustomEvent('cookie-banner-visibility', { detail: visible }));
    emitChange();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.__cookieBannerVisible ?? false;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useCookieBannerVisible(): boolean {
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Also listen for the custom event as a fallback
  useEffect(() => {
    const handler = () => emitChange();
    window.addEventListener('cookie-banner-visibility', handler);
    return () => window.removeEventListener('cookie-banner-visibility', handler);
  }, []);

  return isVisible;
}

// Augment Window interface
declare global {
  interface Window {
    __cookieBannerVisible?: boolean;
  }
}
