'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import {
  Home,
  ShoppingCart,
  Search,
  LayoutDashboard,
  Users,
  Settings,
  Wallet,
  User,
} from 'lucide-react';

const publicItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/order', label: 'Order', icon: ShoppingCart },
  { href: '/track', label: 'Track', icon: Search },
];

const ownerItems = [
  { href: '/owner/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/owner/dashboard/transactions', label: 'Transaksi', icon: Wallet },
  { href: '/owner/dashboard/partners', label: 'Partner', icon: Users },
  { href: '/owner/dashboard/customers', label: 'Customer', icon: User },
  { href: '/owner/dashboard/settings', label: 'Settings', icon: Settings },
];

const partnerItems = [
  { href: '/partner/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/partner/dashboard/customers', label: 'Customer', icon: Users },
  { href: '/partner/dashboard/transactions', label: 'Transaksi', icon: Wallet },
  { href: '/partner/dashboard/settings', label: 'Settings', icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isOwnerDashboard = pathname?.startsWith('/owner/');
  const isPartnerDashboard = pathname?.startsWith('/partner/');
  
  // Don't show mobile nav on auth pages or dashboard pages (they have their own navigation)
  if (isAuthPage || isOwnerDashboard || isPartnerDashboard) return null;

  const items = !isAuthenticated 
    ? publicItems 
    : user?.role === 'owner' 
      ? ownerItems 
      : partnerItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden ios-safe-bottom">
      <div className="bg-background/95 backdrop-blur-xl border-t">
        {/* Floating indicator for iOS-style */}
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-b from-transparent to-black/5" />
        
        <div className="flex items-center justify-around h-[70px] px-1">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-smooth tap-highlight active-scale min-w-[64px]',
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground active:text-foreground'
                )}
              >
                <div className={cn(
                  'p-2.5 rounded-xl transition-smooth',
                  isActive && 'bg-primary/15'
                )}>
                  <Icon className={cn(
                    'w-[22px] h-[22px]',
                    isActive && 'stroke-[2.5px]'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium leading-none',
                  isActive && 'font-semibold'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        
        {/* iOS home indicator bar */}
        <div className="h-1 flex justify-center pb-2">
          <div className="w-32 h-1 bg-foreground/20 rounded-full" />
        </div>
      </div>
    </nav>
  );
}
