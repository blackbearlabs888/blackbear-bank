'use client';

import { useEffect, useCallback, useSyncExternalStore, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Skeleton } from '@/components/ui/skeleton';

// Custom hook for hydration-safe state
function useAuthHydrated() {
  return useSyncExternalStore(
    useCallback((onStoreChange) => useAuthStore.subscribe(onStoreChange), []),
    () => useAuthStore.getState().hasHydrated,
    () => false
  );
}

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

// Safety timeout: if loading takes too long, force-show content
const LOADING_TIMEOUT_MS = 4000;

export function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, hydrate } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const { config, loading } = useSiteConfig();
  const [forceShow, setForceShow] = useState(false);

  // Trigger hydration on mount
  useEffect(() => {
    if (!hasHydrated) {
      hydrate();
    }
  }, [hasHydrated, hydrate]);

  // Safety timeout: force show content after LOADING_TIMEOUT_MS to prevent stuck screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceShow(true);
    }, LOADING_TIMEOUT_MS);
    // Clear timer once loading is done
    if (hasHydrated && !loading) {
      clearTimeout(timer);
    }
    return () => clearTimeout(timer);
  }, [hasHydrated, loading]);

  // Pages that should always be accessible even during maintenance
  const alwaysAccessiblePages = useMemo(() => [
    '/maintenance',
    '/login',
    '/register',
  ], []);

  // Owner dashboard pages that owner can access during maintenance
  const ownerPages = useMemo(() => [
    '/owner/',
  ], []);

  // Compute if current page is accessible
  const isAccessible = useMemo(() => {
    if (!hasHydrated || loading) return true; // Return true during loading to prevent blank

    // Always accessible pages
    if (alwaysAccessiblePages.some(page => pathname?.startsWith(page))) {
      return true;
    }

    // Check maintenance mode
    if (config.maintenanceMode) {
      // Owner can access their dashboard pages
      if (isAuthenticated && user?.role === 'owner') {
        if (ownerPages.some(page => pathname?.startsWith(page))) {
          return true;
        }
      }
      return false;
    }

    return true;
  }, [hasHydrated, loading, config.maintenanceMode, isAuthenticated, user, pathname, alwaysAccessiblePages, ownerPages]);

  // Handle redirects
  useEffect(() => {
    if (!hasHydrated || loading) return;

    // Check if maintenance mode is enabled
    if (config.maintenanceMode) {
      // Redirect to maintenance page for non-owner or public pages
      if (!alwaysAccessiblePages.some(page => pathname?.startsWith(page))) {
        if (!(isAuthenticated && user?.role === 'owner' && ownerPages.some(page => pathname?.startsWith(page)))) {
          if (!pathname?.startsWith('/maintenance')) {
            router.replace('/maintenance');
          }
        }
      }
    } else {
      // If not in maintenance mode, redirect away from maintenance page
      if (pathname === '/maintenance') {
        router.replace('/');
      }
    }
  }, [hasHydrated, loading, config.maintenanceMode, isAuthenticated, user, pathname, router, alwaysAccessiblePages, ownerPages]);

  // Show loading skeleton while checking (but respect force timeout)
  if (!hasHydrated || loading) {
    if (forceShow) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto bg-muted-foreground/20" />
          <Skeleton className="h-8 w-1/2 mx-auto bg-muted-foreground/20" />
          <Skeleton className="h-32 w-full rounded-xl bg-muted-foreground/20" />
          <Skeleton className="h-32 w-full rounded-xl bg-muted-foreground/20" />
        </div>
      </div>
    );
  }

  // On maintenance page but not in maintenance mode (will redirect)
  if (pathname === '/maintenance' && !config.maintenanceMode) {
    return null;
  }

  // Not accessible (will redirect to maintenance)
  if (!isAccessible) {
    return null;
  }

  return <>{children}</>;
}
