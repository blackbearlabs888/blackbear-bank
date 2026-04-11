'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon,
  Sun,
  Menu,
  LogOut,
  Settings,
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Megaphone,
  Bell,
  Home,
  X,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuthStore, useIsOwner, useIsPartner } from '@/store/auth'
import { useSiteConfig } from '@/hooks/use-maintenance'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
}

const ownerNavItems: NavItem[] = [
  { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/owner/transactions', label: 'Transaksi', icon: ShoppingCart },
  { href: '/owner/partners', label: 'Mitra', icon: Users },
  { href: '/owner/customers', label: 'Customer', icon: Users },
  { href: '/owner/platform', label: 'Platform', icon: CreditCard },
  { href: '/owner/broadcast', label: 'Broadcast', icon: Megaphone },
  { href: '/owner/settings', label: 'Settings', icon: Settings },
]

const partnerNavItems: NavItem[] = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/customers', label: 'Customer', icon: Users },
  { href: '/partner/transactions', label: 'Transaksi', icon: ShoppingCart },
  { href: '/partner/notifications', label: 'Notifikasi', icon: Bell },
  { href: '/partner/settings', label: 'Settings', icon: Settings },
]

// ============================================
// DESKTOP SIDEBAR COMPONENT
// ============================================
function DesktopSidebar({
  pathname,
  user,
  partner,
  isPartner,
  isOwner,
  theme,
  setTheme,
  handleLogout,
  brandName,
  brandInitials,
  logoUrl,
  navItems,
}: {
  pathname: string
  user: { name?: string | null; avatar?: string | null; role: string } | null
  partner: { tier: string } | null
  isPartner: boolean
  isOwner: boolean
  theme: string | undefined
  setTheme: (theme: string) => void
  handleLogout: () => void
  brandName: string
  brandInitials: string
  logoUrl: string | null
  navItems: NavItem[]
}) {
  return (
    <aside className="hidden md:flex w-64 border-r bg-card flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">{brandInitials}</span>
            </div>
          )}
          <span className="font-bold text-lg">{brandName}</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar || undefined} />
            <AvatarFallback className="gradient-primary text-white">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {user?.role}
              </Badge>
              {isPartner && partner && (
                <Badge variant="outline" className="text-xs">
                  {partner.tier}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="h-px bg-border my-2" />
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 mr-2" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 mr-2" />
              Dark Mode
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  )
}

// ============================================
// MOBILE BOTTOM NAVIGATION
// ============================================
function MobileBottomNav({
  pathname,
  navItems,
  brandName,
  brandInitials,
  logoUrl,
  user,
  partner,
  isPartner,
  theme,
  setTheme,
  handleLogout,
}: {
  pathname: string
  navItems: NavItem[]
  brandName: string
  brandInitials: string
  logoUrl: string | null
  user: { name?: string | null; avatar?: string | null; role: string } | null
  partner: { tier: string } | null
  isPartner: boolean
  theme: string | undefined
  setTheme: (theme: string) => void
  handleLogout: () => void
}) {
  const [showMore, setShowMore] = useState(false)
  
  // Show first 3 items + More button
  const visibleItems = navItems.slice(0, 3)
  const moreItems = navItems.slice(3)
  
  // Check if any "more" item is active
  const isMoreActive = moreItems.some(item => pathname === item.href)
  
  return (
    <>
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg mobile-bottom-nav-safari"
        style={{
          // Safari-specific inline styles for maximum compatibility
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          // @ts-expect-error - Safari specific
          WebkitTransform: 'translate3d(0, 0, 0)',
          transform: 'translate3d(0, 0, 0)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all min-w-[64px] touch-target',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:bg-muted/50'
                )}
              >
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 -m-1 rounded-lg bg-primary/10"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className={cn('h-5 w-5 relative', isActive && 'text-primary')} />
                </div>
                <span className={cn(
                  'text-[10px] mt-1 font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          {/* More Button - only show if there are more items */}
          {moreItems.length > 0 && (
            <button
              onClick={() => setShowMore(true)}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all min-w-[64px] touch-target',
                isMoreActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:bg-muted/50'
              )}
            >
              <div className="relative">
                {isMoreActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 -m-1 rounded-lg bg-primary/10"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Menu className={cn('h-5 w-5 relative', isMoreActive && 'text-primary')} />
              </div>
              <span className={cn(
                'text-[10px] mt-1 font-medium',
                isMoreActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                Lainnya
              </span>
            </button>
          )}
        </div>
        
        {/* iOS Safe Area - using env() for proper safe area handling */}
        <div 
          className="bg-background/95" 
          style={{ 
            height: 'env(safe-area-inset-bottom, 0px)',
            minHeight: '8px'
          }} 
        />
      </nav>
      
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            {/* Overlay - clickable to close menu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mobile-menu-overlay"
              onClick={() => setShowMore(false)}
            />
            {/* Menu Content - slides up from bottom */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden mobile-menu-content bg-background"
            >
              <div 
                className="p-4 scroll-touch overflow-y-auto max-h-[70vh]"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain'
                }}
              >
                {/* User Info */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback className="gradient-primary text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user?.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {user?.role}
                      </Badge>
                      {isPartner && partner && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {partner.tier}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowMore(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {moreItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMore(false)}
                        className={cn(
                          'flex flex-col items-center justify-center p-3 rounded-xl transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted active:bg-muted'
                        )}
                      >
                        <Icon className="h-6 w-6 mb-1" />
                        <span className="text-xs font-medium text-center">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                  <Link
                    href="/"
                    onClick={() => setShowMore(false)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted"
                  >
                    <Home className="h-5 w-5 mb-1" />
                    <span className="text-xs">Beranda</span>
                  </Link>
                  <button
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark')
                      setShowMore(false)
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted"
                  >
                    {theme === 'dark' ? <Sun className="h-5 w-5 mb-1" /> : <Moon className="h-5 w-5 mb-1" />}
                    <span className="text-xs">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMore(false)
                      handleLogout()
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20"
                  >
                    <LogOut className="h-5 w-5 mb-1" />
                    <span className="text-xs">Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================
// MOBILE PAGE HEADER (Simple title only)
// ============================================
function MobilePageHeader({
  navItems,
  pathname,
}: {
  navItems: NavItem[]
  pathname: string
}) {
  const currentItem = navItems.find(item => item.href === pathname)

  if (!currentItem) return null

  return (
    <header className="md:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg safe-area-top">
      <div className="flex items-center justify-center h-12 px-4">
        <div className="flex items-center gap-2">
          <currentItem.icon className="h-4 w-4 text-primary" />
          <span className="font-semibold">{currentItem.label}</span>
        </div>
      </div>
    </header>
  )
}

// ============================================
// MAIN DASHBOARD LAYOUT
// ============================================
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, partner, isAuthenticated, logout, token } = useAuthStore()
  const isOwner = useIsOwner()
  const isPartner = useIsPartner()
  const { config: siteConfig } = useSiteConfig()
  
  const brandName = siteConfig?.brandName || 'Black Bear'
  const brandInitials = brandName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  const navItems = isOwner ? ownerNavItems : partnerNavItems

  // Validate session on mount - check if stored token is still valid
  const [isValidating, setIsValidating] = useState(true)

  const validateSession = useCallback(async () => {
    if (!token) {
      setIsValidating(false)
      return
    }
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        // Token is invalid, clear session
        logout()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('blackbear-auth')
        }
        router.push('/login')
      }
    } catch {
      // Network error - don't force logout, just continue
      console.error('Session validation failed')
    } finally {
      setIsValidating(false)
    }
  }, [token, logout, router])

  useEffect(() => {
    validateSession()
  }, [validateSession])

  const handleLogout = async () => {
    try {
      // Call the logout API to clear the httpOnly cookie
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout API call failed:', e)
    }
    // Clear Zustand store (which also clears localStorage persist)
    logout()
    // Explicitly clear any remaining localStorage data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('blackbear-auth')
    }
    // Redirect to home
    router.push('/')
    router.refresh()
  }

  if (!isAuthenticated || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        pathname={pathname}
        user={user}
        partner={partner}
        isPartner={isPartner}
        isOwner={isOwner}
        theme={theme}
        setTheme={setTheme}
        handleLogout={handleLogout}
        brandName={brandName}
        brandInitials={brandInitials}
        logoUrl={siteConfig?.logoUrl || null}
        navItems={navItems}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Page Header - Simple title only */}
        <MobilePageHeader
          navItems={navItems}
          pathname={pathname}
        />

        {/* Page Content - Mobile Optimized */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto pb-20 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          pathname={pathname}
          navItems={navItems}
          brandName={brandName}
          brandInitials={brandInitials}
          logoUrl={siteConfig?.logoUrl || null}
          user={user}
          partner={partner}
          isPartner={isPartner}
          theme={theme}
          setTheme={setTheme}
          handleLogout={handleLogout}
        />
      </div>
    </div>
  )
}
