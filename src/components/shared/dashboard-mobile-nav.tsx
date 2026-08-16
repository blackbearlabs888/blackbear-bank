'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  User,
  Megaphone,
  Percent,
  MoreHorizontal,
  X,
  Bell,
  MessageSquare,
  FileText,
  HelpCircle,
  MapPin,
  Star,
  ShieldAlert,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const ownerItems = [
  { href: '/owner/dashboard', label: 'Home', icon: LayoutDashboard, matchExact: true },
  { href: '/owner/dashboard/transactions', label: 'Transaksi', icon: Wallet },
  { href: '/owner/dashboard/partners', label: 'Partner', icon: Users },
  { href: '/owner/dashboard/customers', label: 'Customer', icon: User },
];

const ownerMoreItems = [
  // Transaksi group
  { href: '/owner/dashboard/fraud-review', label: 'Fraud Review', icon: ShieldAlert, group: 'Transaksi' },
  { href: '/owner/dashboard/notifications', label: 'Notifikasi', icon: Bell, group: 'Transaksi' },
  // Pengaturan group
  { href: '/owner/dashboard/testimonials', label: 'Testimoni', icon: Star, group: 'Transaksi' },
  { href: '/owner/dashboard/fees', label: 'Pengaturan Fee', icon: Percent, group: 'Pengaturan' },
  { href: '/owner/dashboard/broadcast', label: 'Broadcast', icon: Megaphone, group: 'Pengaturan' },
  { href: '/owner/dashboard/seo/blog', label: 'Blog', icon: FileText, group: 'SEO' },
  { href: '/owner/dashboard/seo/faq', label: 'FAQ', icon: HelpCircle, group: 'SEO' },
  { href: '/owner/dashboard/seo/location', label: 'Lokasi', icon: MapPin, group: 'SEO' },
  { href: '/owner/dashboard/settings', label: 'Konfigurasi', icon: Settings, group: 'Pengaturan' },
];

const partnerItems = [
  { href: '/partner/dashboard', label: 'Home', icon: LayoutDashboard, matchExact: true },
  { href: '/partner/dashboard/customers', label: 'Customer', icon: Users },
  { href: '/partner/dashboard/transactions', label: 'Transaksi', icon: Wallet },
  { href: '/partner/dashboard/settings', label: 'Setting', icon: Settings },
];

export function DashboardMobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const isOwnerPage = pathname?.startsWith('/owner/');
  const isPartnerPage = pathname?.startsWith('/partner/');
  
  // Only show on dashboard pages
  if (!isOwnerPage && !isPartnerPage) return null;

  const items = user?.role === 'owner' ? ownerItems : partnerItems;
  const moreItems = user?.role === 'owner' ? ownerMoreItems : [];

  const isActive = (item: { href: string; matchExact?: boolean }) => {
    if (item.matchExact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname?.startsWith(item.href + '/');
  };

  const isMoreActive = moreItems.some(item => isActive(item));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden ios-safe-bottom">
      <div className="bg-background/95 backdrop-blur-xl border-t shadow-lg">
        <div className="flex items-center justify-around h-14 px-2">
          {items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 tap-highlight active-scale min-w-[60px]',
                  active 
                    ? 'text-primary scale-105' 
                    : 'text-muted-foreground'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-xl transition-all duration-200',
                  active && 'bg-primary/20 shadow-sm'
                )}>
                  <Icon className={cn(
                    'w-5 h-5 transition-all duration-200',
                    active && 'stroke-[2.5px]'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium leading-none transition-all duration-200',
                  active && 'font-semibold'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More Button for Owner */}
          {moreItems.length > 0 && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 tap-highlight active-scale min-w-[60px]',
                    isMoreActive 
                      ? 'text-primary scale-105' 
                      : 'text-muted-foreground'
                  )}
                >
                  <div className={cn(
                    'p-1.5 rounded-xl transition-all duration-200',
                    isMoreActive && 'bg-primary/20 shadow-sm'
                  )}>
                    <MoreHorizontal className={cn(
                      'w-5 h-5 transition-all duration-200',
                      isMoreActive && 'stroke-[2.5px]'
                    )} />
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium leading-none transition-all duration-200',
                    isMoreActive && 'font-semibold'
                  )}>
                    Lainnya
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl pt-3">
                <SheetHeader className="pb-3">
                  <SheetTitle className="text-lg">Menu Lainnya</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 pb-4 max-h-[60vh] overflow-y-auto">
                  {/* Group items by category */}
                  {['Transaksi', 'Pengaturan', 'SEO'].map((group) => {
                    const groupItems = moreItems.filter(item => item.group === group);
                    if (groupItems.length === 0) return null;
                    
                    return (
                      <div key={group}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{group}</p>
                        <div className="space-y-1">
                          {groupItems.map((item) => {
                            const active = isActive(item as { href: string; matchExact?: boolean });
                            const Icon = item.icon;
                            
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMoreOpen(false)}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-xl transition-all tap-highlight active-scale',
                                  active 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'hover:bg-muted'
                                )}
                              >
                                <div className={cn(
                                  'w-10 h-10 rounded-xl flex items-center justify-center',
                                  active ? 'bg-primary/20' : 'bg-muted'
                                )}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">{item.label}</span>
                                {active && (
                                  <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        
        {/* iOS home indicator bar */}
        <div className="h-1 flex justify-center pb-2">
          <div className="w-32 h-1 bg-foreground/20 rounded-full" />
        </div>
      </div>
    </nav>
  );
}
