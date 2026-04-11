'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart, Search, User, LayoutDashboard, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const navItems = [
  { 
    href: '/', 
    icon: Home, 
    label: 'Beranda',
    activePaths: ['/', '']
  },
  { 
    href: '/order', 
    icon: ShoppingCart, 
    label: 'Order',
    activePaths: ['/order']
  },
  { 
    href: '/track', 
    icon: Search, 
    label: 'Track',
    activePaths: ['/track']
  },
  { 
    href: '/login', 
    icon: User, 
    label: 'Akun',
    activePaths: ['/login', '/register']
  },
]

export function MobileBottomBar() {
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuthStore()

  // Don't show on dashboard pages
  if (pathname?.includes('/owner/') || pathname?.includes('/partner/')) {
    return null
  }

  // Determine if current path is active
  const isItemActive = (item: typeof navItems[0]) => {
    return item.activePaths.some(path => pathname === path)
  }

  // Get the appropriate href for account item
  const getAccountHref = () => {
    if (isAuthenticated) {
      return user?.role === 'OWNER' ? '/owner/dashboard' : '/partner/dashboard'
    }
    return '/login'
  }

  return (
    <>
      {/* Spacer for content to not be hidden behind navbar */}
      <div className="h-20 md:hidden" />
      
      {/* Safari-compatible fixed bottom navbar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden mobile-bottom-nav-safari"
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
        {/* Safe area background for iOS */}
        <div className="bg-background/95 backdrop-blur-lg border-t border-border/50">
          {/* Main navigation container */}
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const isActive = isItemActive(item)
              const Icon = item.icon
              
              // Special handling for account item when authenticated
              const href = item.label === 'Akun' && isAuthenticated 
                ? getAccountHref() 
                : item.href

              return (
                <Link
                  key={item.href}
                  href={href}
                  className="relative flex-1 flex flex-col items-center justify-center py-2 group"
                >
                  {/* Active background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-x-2 top-1 bottom-1 rounded-xl gradient-primary opacity-15"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon container */}
                  <div className="relative z-10">
                    <motion.div
                      initial={false}
                      animate={{ 
                        scale: isActive ? 1.1 : 1,
                        y: isActive ? -2 : 0
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isActive 
                          ? "gradient-primary text-white shadow-lg shadow-primary/25" 
                          : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      
                      {/* Sparkle effect for active state */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="absolute -top-1 -right-1"
                        >
                          <Sparkles className="h-3 w-3 text-yellow-400" />
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Label */}
                  <motion.span 
                    initial={false}
                    animate={{ 
                      fontWeight: isActive ? 600 : 400,
                    }}
                    className={cn(
                      "text-[10px] mt-1 transition-colors",
                      isActive 
                        ? "text-primary font-semibold" 
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {item.label === 'Akun' && isAuthenticated ? 'Dashboard' : item.label}
                  </motion.span>
                  
                  {/* Active dot indicator */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute bottom-0 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </Link>
              )
            })}
          </div>
          
          {/* iOS Safe Area - using env() for proper safe area handling */}
          <div 
            className="bg-background/95" 
            style={{ 
              height: 'env(safe-area-inset-bottom, 0px)',
              minHeight: '8px'
            }} 
          />
        </div>
      </nav>
    </>
  )
}
