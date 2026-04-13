'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sun,
  Moon,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Wallet,
  Users,
  Settings,
  Megaphone,
  FileText,
  HelpCircle,
  MapPin,
  Percent,
  Bell,
  Star,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/order', label: 'Order' },
  { href: '/track', label: 'Track' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/lokasi', label: 'Lokasi' },
];

const ownerMenuGroups = {
  pengguna: {
    label: 'Pengguna',
    items: [
      { href: '/owner/dashboard/partners', label: 'Partner', icon: Users },
      { href: '/owner/dashboard/customers', label: 'Customer', icon: Users },
    ],
  },
  transaksi: {
    label: 'Transaksi',
    items: [
      { href: '/owner/dashboard/transactions', label: 'Semua Transaksi', icon: Wallet },
      { href: '/owner/dashboard/notifications', label: 'Notifikasi', icon: Bell },
      { href: '/owner/dashboard/testimonials', label: 'Testimoni', icon: Star },
    ],
  },
  pengaturan: {
    label: 'Pengaturan',
    items: [
      { href: '/owner/dashboard/fees', label: 'Fee', icon: Percent },
      { href: '/owner/dashboard/broadcast', label: 'Broadcast', icon: Megaphone },
    ],
  },
};

const seoMenuItems = [
  { href: '/owner/dashboard/seo/blog', label: 'Blog', icon: FileText },
  { href: '/owner/dashboard/seo/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/owner/dashboard/seo/location', label: 'Lokasi', icon: MapPin },
];

const partnerLinks = [
  { href: '/partner/dashboard', label: 'Dashboard' },
  { href: '/partner/dashboard/customers', label: 'Customer' },
  { href: '/partner/dashboard/transactions', label: 'Transaksi' },
  { href: '/partner/dashboard/settings', label: 'Settings' },
];

export function DesktopNavbar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { config, getInitials } = useSiteConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isDashboardPage = pathname?.startsWith('/owner/') || pathname?.startsWith('/partner/') || pathname?.startsWith('/dashboard');

  const isGroupActive = (items: { href: string }[]) =>
    items.some(item => pathname === item.href || pathname?.startsWith(item.href + '/'));

  return (
    <>
      <header className="sticky top-0 z-50 w-full ios-safe-top">
        <div className={cn(
          "absolute inset-0 transition-all duration-300",
          isScrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
            : "bg-transparent"
        )} />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 tap-highlight group">
              {config.logoUrl && !logoError ? (
                <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center p-1 dark:bg-transparent dark:border-transparent transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={config.logoUrl}
                    alt={config.websiteTitle}
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  <span className="text-white font-bold text-xs">{getInitials()}</span>
                </div>
              )}
              <span className="font-semibold text-base hidden sm:block tracking-tight">{config.websiteTitle}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {!isAuthenticated ? (
                publicLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm transition-colors duration-200',
                        isActive
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })
              ) : user?.role === 'owner' ? (
                <div className="flex items-center gap-1">
                  <Link
                    href="/owner/dashboard"
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-colors duration-200',
                      pathname === '/owner/dashboard'
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Dashboard
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn(
                        'px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 flex items-center gap-1',
                        isGroupActive(ownerMenuGroups.pengguna.items)
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}>
                        Pengguna
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {ownerMenuGroups.pengguna.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                            <Link href={item.href} className={cn(
                              'flex items-center gap-2',
                              isActive && 'bg-primary/10 text-primary'
                            )}>
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn(
                        'px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 flex items-center gap-1',
                        isGroupActive(ownerMenuGroups.transaksi.items)
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}>
                        Transaksi
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {ownerMenuGroups.transaksi.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                            <Link href={item.href} className={cn(
                              'flex items-center gap-2',
                              isActive && 'bg-primary/10 text-primary'
                            )}>
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn(
                        'px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 flex items-center gap-1',
                        isGroupActive(ownerMenuGroups.pengaturan.items) || isGroupActive(seoMenuItems) || pathname === '/owner/dashboard/settings'
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}>
                        Pengaturan
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {ownerMenuGroups.pengaturan.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                            <Link href={item.href} className={cn(
                              'flex items-center gap-2',
                              isActive && 'bg-primary/10 text-primary'
                            )}>
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            SEO
                          </span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-40">
                          {seoMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                              <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                                <Link href={item.href} className={cn(
                                  'flex items-center gap-2',
                                  isActive && 'bg-primary/10 text-primary'
                                )}>
                                  <Icon className="w-4 h-4 text-muted-foreground" />
                                  {item.label}
                                </Link>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/owner/dashboard/settings" className={cn(
                          'flex items-center gap-2',
                          pathname === '/owner/dashboard/settings' && 'bg-primary/10 text-primary'
                        )}>
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          Config
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                partnerLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'inline-flex items-center h-8 px-3 rounded-lg text-sm transition-colors duration-200',
                        isActive
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "w-9 h-9 rounded-lg border border-border/50 flex items-center justify-center hover:bg-muted transition-colors",
                  isDashboardPage && "md:hidden hidden"
                )}
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4 text-foreground" />
                ) : (
                  <Moon className="h-4 w-4 text-foreground" />
                )}
              </button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 w-9 sm:h-auto sm:w-auto sm:px-3 sm:pr-2 rounded-lg group transition-colors duration-200 hover:bg-muted"
                    >
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block ml-2 text-sm font-medium">
                        {user?.name?.split(' ')[0]}
                      </span>
                      <ChevronDown className="hidden sm:block w-3.5 h-3.5 ml-1 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 p-1.5"
                    align="end"
                    forceMount
                    sideOffset={8}
                  >
                    <DropdownMenuLabel className="font-normal p-2.5 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user?.avatar} alt={user?.name} />
                          <AvatarFallback className="gradient-primary text-white text-sm font-semibold">
                            {user?.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-medium leading-none">{user?.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {user?.email}
                          </p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary w-fit mt-1">
                            {user?.role}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer rounded-md px-2.5 py-2"
                    >
                      <Link href={user?.role === 'owner' ? '/owner/dashboard' : '/partner/dashboard'} className="flex items-center">
                        <LayoutDashboard className="mr-2.5 h-4 w-4 text-muted-foreground" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-destructive cursor-pointer rounded-md px-2.5 py-2 focus:bg-destructive/10"
                    >
                      <LogOut className="mr-2.5 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                !isAuthPage && (
                  <Button asChild className="gradient-primary text-white rounded-lg h-9 px-5 text-sm font-medium shadow-sm shadow-primary/20 hover:shadow-primary/30 transition-all duration-200">
                    <Link href="/login">
                      Login
                    </Link>
                  </Button>
                )
              )}

              {/* Mobile menu button */}
              {!isDashboardPage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden rounded-lg h-9 w-9 transition-colors duration-200 hover:bg-muted"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={cn(
        "fixed inset-0 z-40 md:hidden transition-all duration-300",
        mobileMenuOpen && !isDashboardPage ? "visible" : "invisible pointer-events-none"
      )}>
        <div
          className={cn(
            "absolute inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300",
            mobileMenuOpen && !isDashboardPage ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileMenuOpen(false)}
        />

        <div className={cn(
          "absolute top-0 right-0 bottom-0 w-[260px] max-w-[80vw] bg-background border-l shadow-xl transition-transform duration-300 ease-out",
          mobileMenuOpen && !isDashboardPage ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <span className="font-semibold text-sm">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex flex-col p-3 gap-0.5 overflow-y-auto h-[calc(100%-56px)]">
            {!isAuthenticated ? (
              publicLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'text-foreground bg-primary/10'
                        : 'text-muted-foreground active:text-foreground active:bg-muted'
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })
            ) : (
              <>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm text-muted-foreground"
                >
                  ← Home
                </Link>
                <Link
                  href={user?.role === 'owner' ? '/owner/dashboard' : '/partner/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-primary"
                >
                  Dashboard
                </Link>
              </>
            )}

            {!isAuthenticated && !isAuthPage && (
              <Button
                asChild
                className="gradient-primary text-white rounded-lg h-10 mt-3 text-sm font-medium"
              >
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
