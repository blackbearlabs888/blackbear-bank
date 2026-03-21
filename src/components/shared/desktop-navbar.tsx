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
} from '@/components/ui/dropdown-menu';
import {
  Sun,
  Moon,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/order', label: 'Order' },
  { href: '/track', label: 'Track' },
];

const ownerLinks = [
  { href: '/owner/dashboard', label: 'Dashboard' },
  { href: '/owner/dashboard/transactions', label: 'Transaksi' },
  { href: '/owner/dashboard/partners', label: 'Partner' },
  { href: '/owner/dashboard/customers', label: 'Customer' },
  { href: '/owner/dashboard/fees', label: 'Fee' },
  { href: '/owner/dashboard/broadcast', label: 'Broadcast' },
  { href: '/owner/dashboard/settings', label: 'Config' },
];

const partnerLinks = [
  { href: '/partner/dashboard', label: 'Dashboard' },
  { href: '/partner/dashboard/customers', label: 'Customer' },
  { href: '/partner/dashboard/transactions', label: 'Transaksi' },
  { href: '/partner/dashboard/settings', label: 'Settings' },
];

export function DesktopNavbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { config, getInitials } = useSiteConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isDashboardPage = pathname?.startsWith('/owner/') || pathname?.startsWith('/partner/') || pathname?.startsWith('/dashboard');

  const links = !isAuthenticated 
    ? publicLinks 
    : user?.role === 'owner' 
      ? ownerLinks 
      : partnerLinks;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl ios-safe-top">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 tap-highlight active-scale">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={config.websiteTitle}
                  className="w-9 h-9 rounded-xl object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">{getInitials()}</span>
                </div>
              )}
              <span className="font-bold text-lg hidden sm:block">{config.websiteTitle}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-smooth tap-highlight',
                    pathname === link.href
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Theme Toggle - hidden on mobile dashboard */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "tap-highlight rounded-xl h-10 w-10",
                  isDashboardPage && "md:hidden hidden"
                )}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 sm:h-auto sm:w-auto sm:pr-2 rounded-xl tap-highlight">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback className="gradient-primary text-white text-sm font-semibold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block ml-2 font-medium text-sm">
                        {user?.name?.split(' ')[0]}
                      </span>
                      <ChevronDown className="hidden sm:block w-4 h-4 ml-1 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1.5">
                        <p className="text-sm font-semibold leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                        <span className="text-xs text-primary font-medium capitalize mt-1">
                          {user?.role}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer tap-highlight">
                      <Link href={user?.role === 'owner' ? '/owner/dashboard' : '/partner/dashboard'} className="flex items-center">
                        <LayoutDashboard className="mr-3 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer tap-highlight">
                      <LogOut className="mr-3 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                !isAuthPage && (
                  <Button asChild className="gradient-primary text-white rounded-xl h-10 px-5">
                    <Link href="/login" className="tap-hidden">
                      Login
                    </Link>
                  </Button>
                )
              )}

              {/* Mobile menu button - hidden on dashboard pages */}
              {!isDashboardPage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden tap-highlight rounded-xl h-10 w-10"
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

      {/* Mobile Menu Overlay - only for non-dashboard pages */}
      {mobileMenuOpen && !isDashboardPage && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-xl border-b shadow-lg animate-slide-up">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {links.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-4 py-3.5 rounded-xl text-base font-medium transition-smooth tap-highlight animate-fade-in',
                    pathname === link.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted active:bg-muted'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && !isAuthPage && (
                <Button 
                  asChild 
                  className="gradient-primary text-white rounded-xl h-12 mt-3 animate-fade-in"
                  style={{ animationDelay: `${links.length * 30}ms` }}
                >
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
