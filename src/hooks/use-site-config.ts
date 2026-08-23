'use client';

import { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '@/lib/get-error-message';
import { useServerSiteConfig } from '@/lib/server-site-config';

export interface SiteConfig {
  websiteTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  footerEmail: string | null;
  footerWhatsapp: string | null;
  footerInstagram: string | null;
  footerFacebook: string | null;
  footerTiktok: string | null;
  footerYoutube: string | null;
  footerThreads: string | null;
  maintenanceMode: boolean;
}

const defaultConfig: SiteConfig = {
  websiteTitle: 'Black Bear',
  logoUrl: null,
  faviconUrl: null,
  metaTitle: 'Black Bear - Layanan Tarik Tunai Terpercaya',
  metaDescription: 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman.',
  footerEmail: null,
  footerWhatsapp: null,
  footerInstagram: null,
  footerFacebook: null,
  footerTiktok: null,
  footerYoutube: null,
  footerThreads: null,
  maintenanceMode: false,
};

// Global cache for site config
let cachedConfig: SiteConfig | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useSiteConfig() {
  // Use server-provided config as initial state (no API fetch delay for logo/title)
  const serverConfig = useServerSiteConfig();
  const [config, setConfig] = useState<SiteConfig>(serverConfig.config);
  const [loading, setLoading] = useState(false); // Start false since we have server data
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (forceRefresh = false) => {
    // Use cache if available and not expired
    const now = Date.now();
    if (!forceRefresh && cachedConfig && (now - cacheTimestamp) < CACHE_DURATION) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/site-config');
      const result = await response.json();
      
      if (result.success && result.data) {
        cachedConfig = result.data;
        cacheTimestamp = now;
        setConfig(result.data);
        setError(null);
      } else {
        setError(getErrorMessage(result.error, 'Gagal memuat konfigurasi'));
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Failed to fetch site config:', err);
      setError('Failed to load config');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshConfig = useCallback(() => {
    return fetchConfig(true);
  }, [fetchConfig]);

  useEffect(() => {
    // Still fetch in background to keep config fresh
    // But initial render uses server-provided data (no delay)
    fetchConfig();
  }, [fetchConfig]);

  // Get initials from website title for logo fallback
  const getInitials = useCallback(() => {
    const title = config.websiteTitle || 'Black Bear';
    const words = title.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.substring(0, 2).toUpperCase();
  }, [config.websiteTitle]);

  // Generate WhatsApp link
  const getWhatsAppLink = useCallback((message?: string) => {
    const phone = config.footerWhatsapp;
    if (!phone) return null;
    const baseUrl = `https://wa.me/${phone}`;
    return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
  }, [config.footerWhatsapp]);

  return {
    config,
    loading,
    error,
    refreshConfig,
    getInitials,
    getWhatsAppLink,
  };
}

// Export cache invalidation function for use after updates
export function invalidateSiteConfigCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}
