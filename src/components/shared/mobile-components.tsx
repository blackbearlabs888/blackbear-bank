'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { X, Plus } from 'lucide-react'

// Mobile Bottom Sheet Component
interface MobileBottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function MobileBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: MobileBottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn('max-h-[90vh]', className)}>
        {(title || description) && (
          <DrawerHeader className="border-b px-4 py-3">
            {title && <DrawerTitle className="text-lg">{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
            <DrawerClose className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DrawerClose>
          </DrawerHeader>
        )}
        <div className="flex-1 overflow-y-auto p-4 pb-safe">
          {children}
        </div>
        {footer && <DrawerFooter className="border-t px-4 py-3">{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  )
}

// Floating Action Button Component
interface FloatingActionButtonProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  className?: string
  disabled?: boolean
}

export function FloatingActionButton({
  onClick,
  icon,
  label,
  className,
  disabled,
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg',
        'gradient-primary gradient-primary-hover text-white',
        'flex items-center justify-center',
        'transition-transform active:scale-95',
        'md:hidden',
        label && 'w-auto px-6',
        className
      )}
      size="icon"
    >
      {icon || <Plus className="h-6 w-6" />}
      {label && <span className="ml-2">{label}</span>}
    </Button>
  )
}

// Mobile Card Component
interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  isHighlighted?: boolean
}

export function MobileCard({ children, className, onClick, isHighlighted }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm',
        'transition-all duration-200',
        onClick && 'cursor-pointer active:scale-[0.98]',
        isHighlighted && 'border-primary ring-2 ring-primary/20',
        className
      )}
    >
      {children}
    </div>
  )
}

// Swipe Action Component
interface SwipeActionProps {
  children: React.ReactNode
  leftActions?: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    className?: string
  }>
  rightActions?: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    className?: string
  }>
}

export function SwipeAction({ children, leftActions = [], rightActions = [] }: SwipeActionProps) {
  const [swipeX, setSwipeX] = React.useState(0)
  const [startX, setStartX] = React.useState(0)
  const [isSwiping, setIsSwiping] = React.useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    const currentX = e.touches[0].clientX
    const diff = currentX - startX
    // Limit swipe distance
    setSwipeX(Math.max(-100, Math.min(100, diff)))
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    // Reset position with animation
    setSwipeX(0)
  }

  const showLeftActions = swipeX > 30
  const showRightActions = swipeX < -30

  return (
    <div className="relative overflow-hidden">
      {/* Left Actions Background */}
      {leftActions.length > 0 && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center',
            'transition-opacity duration-200',
            showLeftActions ? 'opacity-100' : 'opacity-0'
          )}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                'h-full px-4 flex items-center justify-center',
                'bg-green-500 text-white',
                action.className
              )}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs">{action.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions Background */}
      {rightActions.length > 0 && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center',
            'transition-opacity duration-200',
            showRightActions ? 'opacity-100' : 'opacity-0'
          )}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                'h-full px-4 flex items-center justify-center',
                'bg-red-500 text-white',
                action.className
              )}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs">{action.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-card transition-transform duration-200"
        style={{
          transform: `translateX(${swipeX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Mobile Search Bar Component
interface MobileSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFilterClick?: () => void
  filterCount?: number
  className?: string
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onFilterClick,
  filterCount,
  className,
}: MobileSearchBarProps) {
  return (
    <div className={cn('sticky top-0 z-30 bg-background/95 backdrop-blur-sm p-4 pb-safe-top', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-11 pl-10 pr-4 rounded-xl border bg-background text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {onFilterClick && (
          <Button
            variant="outline"
            size="icon"
            onClick={onFilterClick}
            className="h-11 w-11 rounded-xl shrink-0 relative"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {filterCount && filterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// Mobile Section Header Component
interface MobileSectionHeaderProps {
  title: string
  action?: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  children?: React.ReactNode
}

export function MobileSectionHeader({
  title,
  action,
  collapsible,
  defaultOpen = true,
  children,
}: MobileSectionHeaderProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  if (!collapsible) {
    return (
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="border-b">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <svg
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && children}
    </div>
  )
}

// Mobile Stats Grid Component
interface MobileStatsGridProps {
  stats: Array<{
    label: string
    value: string | number
    icon?: React.ReactNode
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    color?: 'default' | 'success' | 'warning' | 'destructive'
  }>
}

export function MobileStatsGrid({ stats }: MobileStatsGridProps) {
  const colorMap = {
    default: 'bg-gradient-to-br from-violet-500 to-purple-600',
    success: 'bg-gradient-to-br from-emerald-500 to-green-600',
    warning: 'bg-gradient-to-br from-amber-500 to-orange-600',
    destructive: 'bg-gradient-to-br from-red-500 to-rose-600',
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            'rounded-xl p-4 text-white shadow-sm',
            stat.color ? colorMap[stat.color] : colorMap.default
          )}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/80 truncate">{stat.label}</p>
              <p className="text-lg font-bold mt-1 truncate">{stat.value}</p>
              {stat.trendValue && (
                <p className={cn(
                  'text-xs mt-1 flex items-center gap-1',
                  stat.trend === 'up' && 'text-green-200',
                  stat.trend === 'down' && 'text-red-200',
                  stat.trend === 'neutral' && 'text-white/70'
                )}>
                  {stat.trend === 'up' && '↑'}
                  {stat.trend === 'down' && '↓'}
                  {stat.trendValue}
                </p>
              )}
            </div>
            {stat.icon && (
              <div className="ml-2 opacity-80">
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Pull to Refresh Component
interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [startY, setStartY] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return
    
    const currentY = e.touches[0].clientY
    const diff = currentY - startY
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(80, diff * 0.5))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
    setStartY(0)
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="overflow-y-auto h-full"
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center py-2 transition-all duration-200"
        style={{
          height: pullDistance,
          opacity: pullDistance / 60,
        }}
      >
        <svg
          className={cn(
            'h-6 w-6 text-primary transition-transform',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: `rotate(${(pullDistance / 60) * 360}deg)`,
          }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      
      {children}
    </div>
  )
}

// Mobile Empty State Component
interface MobileEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function MobileEmptyState({ icon, title, description, action }: MobileEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
