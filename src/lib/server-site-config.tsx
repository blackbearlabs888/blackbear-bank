'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { SiteConfig } from '@/hooks/use-site-config';

interface ServerSiteConfigContextType {
  config: SiteConfig;
}

const defaultConfig: SiteConfig = {
  websiteTitle: 'Black Bear',
  logoUrl: null,
  faviconUrl: null,
  metaTitle: null,
  metaDescription: null,
  footerEmail: null,
  footerWhatsapp: null,
  footerInstagram: null,
  footerFacebook: null,
  footerTiktok: null,
  footerYoutube: null,
  footerThreads: null,
  maintenanceMode: false,
};

const ServerSiteConfigContext = createContext<ServerSiteConfigContextType>({
  config: defaultConfig,
});

export function useServerSiteConfig() {
  return useContext(ServerSiteConfigContext);
}

interface ServerSiteConfigProviderProps {
  children: ReactNode;
  config: SiteConfig;
}

export function ServerSiteConfigProvider({ children, config }: ServerSiteConfigProviderProps) {
  return (
    <ServerSiteConfigContext.Provider value={{ config }}>
      {children}
    </ServerSiteConfigContext.Provider>
  );
}
