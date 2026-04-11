'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on all dashboard pages (owner, partner, and shared dashboard)
  const isDashboardPage = 
    pathname?.startsWith('/owner/') || 
    pathname?.startsWith('/partner/') || 
    pathname?.startsWith('/dashboard');
  
  if (isDashboardPage) {
    return null;
  }
  
  return <Footer />;
}
