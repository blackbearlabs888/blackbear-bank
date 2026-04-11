'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart, Users, Bell, User, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const partnerNavItems = [
  { 
    href: '/partner/dashboard', 
    icon: Home, 
    label: 'Dashboard',
  },
  { 
    href: '/partner/transactions', 
    icon: ShoppingCart, 
    label: 'Transaksi',
  },
  { 
    href: '/partner/customers', 
    icon: Users, 
    label: 'Customer',
  },
  { 
    href: '/partner/notifications', 
    icon: Bell, 
    label: 'Notif',
  },
  { 
    href: '/partner/settings', 
    icon: User, 
    label: 'Akun',
  },
]

export function PartnerMobileNav() {
  const pathname = usePathname()

  // Determine if current path is active
  const isItemActive = (item: typeof partnerNavItems[0]) => {
    return pathname === item.href || pathname?.startsWith(item.href + '/')
  }

  return (
    <>
      {/* Spacer for content to not be hidden behind navbar */}
      <div className="h-20 md:hidden flex-shrink-0" />
      
      {/* Safari-compatible fixed bottom navbar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          // Safari-specific inline styles for maximum compatibility
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          WebkitTransform: 'translate3d(0, 0, 0)',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
      >
        {/* Safe area background for iOS */}
        <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-lg shadow-black/5">
          {/* Main navigation container */}
          <div className="flex items-center justify-around h-16 px-1 safe-area-pb">
            {partnerNavItems.map((item) => {
              const isActive = isItemActive(item)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex-1 flex flex-col items-center justify-center py-2 group touch-target"
                  style={{ minHeight: '44px' }}
                >
                  {/* Active background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="partnerActiveTab"
                      className="absolute inset-x-1 top-0.5 bottom-0.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 opacity-15"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon container */}
                  <div className="relative z-10">
                    <motion.div
                      initial={false}
                      animate={{ 
                        scale: isActive ? 1.15 : 1,
                        y: isActive ? -3 : 0
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                        isActive 
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30" 
                          : "text-muted-foreground group-active:bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      
                      {/* Sparkle effect for active state */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="absolute -top-0.5 -right-0.5"
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
                      "text-[10px] mt-0.5 transition-colors",
                      isActive 
                        ? "text-teal-600 dark:text-teal-400 font-semibold" 
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </motion.span>
                  
                  {/* Active dot indicator */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute bottom-0.5 w-1 h-1 rounded-full bg-teal-500"
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
              minHeight: '4px'
            }} 
          />
        </div>
      </nav>
    </>
  )
}
