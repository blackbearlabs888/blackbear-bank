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
      <header className="sticky top-0 z-50 w-full ios-safe-top">
        {/* Gradient border at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-xl border-b border-transparent" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-18 items-center justify-between py-2">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 tap-highlight active-scale group">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={config.websiteTitle}
                  className="w-10 h-10 rounded-xl object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-105">
                  <span className="text-white font-bold text-sm">{getInitials()}</span>
                </div>
              )}
              <span className="font-bold text-lg hidden sm:block tracking-tight">{config.websiteTitle}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out tap-highlight group',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {/* Background hover effect */}
                    <span className={cn(
                      'absolute inset-0 rounded-xl transition-all duration-300 ease-out',
                      isActive 
                        ? 'bg-primary/10 shadow-sm' 
                        : 'bg-transparent group-hover:bg-muted/80 group-hover:shadow-sm'
                    )} />
                    
                    {/* Active indicator dot */}
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                    )}
                    
                    {/* Link text */}
                    <span className="relative z-10">{link.label}</span>
                    
                    {/* Underline animation */}
                    <span className={cn(
                      'absolute bottom-2 left-4 right-4 h-0.5 rounded-full bg-primary transition-all duration-300 ease-out origin-left',
                      isActive 
                        ? 'scale-x-100 opacity-100' 
                        : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60'
                    )} />
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle - hidden on mobile dashboard */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "tap-highlight rounded-xl h-10 w-10 relative overflow-hidden transition-all duration-300 hover:bg-muted",
                  isDashboardPage && "md:hidden hidden"
                )}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:pr-2 rounded-xl tap-highlight group transition-all duration-300 hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-300">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback className="gradient-primary text-white text-sm font-semibold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block ml-2.5 font-medium text-sm">
                        {user?.name?.split(' ')[0]}
                      </span>
                      <ChevronDown className="hidden sm:block w-4 h-4 ml-1.5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-60 p-2 rounded-xl shadow-xl border bg-background/95 backdrop-blur-xl" 
                    align="end" 
                    forceMount
                    sideOffset={8}
                  >
                    <DropdownMenuLabel className="font-normal p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                          <AvatarImage src={user?.avatar} alt={user?.name} />
                          <AvatarFallback className="gradient-primary text-white font-semibold">
                            {user?.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-semibold leading-none">{user?.name}</p>
                          <p className="text-xs leading-none text-muted-foreground truncate max-w-[140px]">
                            {user?.email}
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary w-fit mt-1">
                            {user?.role}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem 
                      asChild 
                      className="cursor-pointer tap-highlight rounded-lg px-3 py-2.5 transition-colors duration-200 focus:bg-muted"
                    >
                      <Link href={user?.role === 'owner' ? '/owner/dashboard' : '/partner/dashboard'} className="flex items-center">
                        <LayoutDashboard className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem 
                      onClick={logout} 
                      className="text-destructive cursor-pointer tap-highlight rounded-lg px-3 py-2.5 transition-colors duration-200 focus:bg-destructive/10"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                !isAuthPage && (
                  <Button asChild className="gradient-primary text-white rounded-xl h-10 px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
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
                  className="md:hidden tap-highlight rounded-xl h-10 w-10 transition-all duration-300 hover:bg-muted"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <div className="relative w-5 h-5">
                    <Menu className={cn(
                      "absolute inset-0 h-5 w-5 transition-all duration-300",
                      mobileMenuOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                    )} />
                    <X className={cn(
                      "absolute inset-0 h-5 w-5 transition-all duration-300",
                      mobileMenuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                    )} />
                  </div>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - only for non-dashboard pages */}
      <div className={cn(
        "fixed inset-0 z-40 md:hidden transition-all duration-500 ease-out",
        mobileMenuOpen && !isDashboardPage ? "visible" : "invisible pointer-events-none"
      )}>
        {/* Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/30 backdrop-blur-md transition-all duration-500",
            mobileMenuOpen && !isDashboardPage ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Slide-in menu from right */}
        <div className={cn(
          "absolute top-0 right-0 bottom-0 w-[280px] max-w-[85vw] bg-background/95 backdrop-blur-xl shadow-2xl transition-transform duration-500 ease-out",
          mobileMenuOpen && !isDashboardPage ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Menu header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-semibold">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Menu content */}
          <nav className="flex flex-col p-4 gap-1 overflow-y-auto h-[calc(100%-64px)]">
            {links.map((link, index) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'relative px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-300 tap-highlight overflow-hidden',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground active:text-foreground'
                  )}
                  style={{ 
                    transitionDelay: mobileMenuOpen ? `${index * 50}ms` : '0ms',
                    transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(20px)',
                    opacity: mobileMenuOpen ? 1 : 0
                  }}
                >
                  {/* Background effect */}
                  <span className={cn(
                    'absolute inset-0 rounded-xl transition-all duration-300',
                    isActive 
                      ? 'bg-primary/15' 
                      : 'bg-transparent active:bg-muted'
                  )} />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary" />
                  )}
                  
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
            
            {!isAuthenticated && !isAuthPage && (
              <Button 
                asChild 
                className="gradient-primary text-white rounded-xl h-12 mt-4 shadow-lg shadow-primary/25"
                style={{ 
                  transitionDelay: mobileMenuOpen ? `${links.length * 50}ms` : '0ms',
                  transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(20px)',
                  opacity: mobileMenuOpen ? 1 : 0
                }}
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
