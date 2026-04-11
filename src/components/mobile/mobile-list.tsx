"use client"

import * as React from "react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MobileListItemProps {
  id: string | number
  primary: string
  secondary?: string
  tertiary?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onClick?: () => void
  swipeActions?: {
    left?: {
      label: string
      icon?: React.ReactNode
      onClick: () => void
      variant?: "default" | "destructive"
    }
    right?: {
      label: string
      icon?: React.ReactNode
      onClick: () => void
      variant?: "default" | "destructive"
    }
  }
}

export interface MobileListProps {
  items: MobileListItemProps[]
  onRefresh?: () => Promise<void>
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  isLoading?: boolean
  isRefreshing?: boolean
  emptyState?: React.ReactNode
  className?: string
  itemClassName?: string
  pullToRefreshEnabled?: boolean
  infiniteScrollEnabled?: boolean
  itemHeight?: number
}

const REFRESH_THRESHOLD = 80

export function MobileList({
  items,
  onRefresh,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  isRefreshing = false,
  emptyState,
  className,
  itemClassName,
  pullToRefreshEnabled = true,
  infiniteScrollEnabled = true,
}: MobileListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [internalRefreshing, setInternalRefreshing] = React.useState(false)
  const refreshing = isRefreshing ?? internalRefreshing
  const [swipeState, setSwipeState] = React.useState<{ id: string | number | null; direction: "left" | "right" | null }>({ id: null, direction: null })
  
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, REFRESH_THRESHOLD], [0, 1])
  const scale = useTransform(y, [0, REFRESH_THRESHOLD], [0.5, 1])
  const rotate = useTransform(y, [0, REFRESH_THRESHOLD], [0, 360])

  // Infinite scroll observer
  React.useEffect(() => {
    if (!infiniteScrollEnabled || !onLoadMore || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.getElementById("load-more-sentinel")
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => observer.disconnect()
  }, [infiniteScrollEnabled, onLoadMore, hasMore, isLoading])

  const handleDragEnd = async () => {
    if (y.get() > REFRESH_THRESHOLD && onRefresh && !refreshing) {
      setInternalRefreshing(true)
      await onRefresh()
      setInternalRefreshing(false)
    }
    y.set(0)
  }

  const handleSwipe = (item: MobileListItemProps, direction: "left" | "right") => {
    if (swipeState.id === item.id && swipeState.direction === direction) {
      // Execute action
      const action = direction === "left" ? item.swipeActions?.left : item.swipeActions?.right
      if (action) {
        action.onClick()
      }
      setSwipeState({ id: null, direction: null })
    } else {
      setSwipeState({ id: item.id, direction })
    }
  }

  const defaultEmptyState = (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-muted-foreground mb-2">No items to display</div>
    </div>
  )

  return (
    <motion.div
      ref={containerRef}
      drag={pullToRefreshEnabled ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.3, bottom: 0 }}
      style={{ y }}
      onDragEnd={handleDragEnd}
      className={cn("relative", className)}
    >
      {/* Pull to refresh indicator */}
      {pullToRefreshEnabled && (
        <motion.div
          style={{ opacity, scale }}
          className="absolute top-0 left-0 right-0 flex justify-center py-4 -translate-y-full pointer-events-none"
        >
          <motion.div style={{ rotate }}>
            {refreshing ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-6 w-6 text-primary" />
            )}
          </motion.div>
        </motion.div>
      )}

      {/* List items */}
      {items.length === 0 ? (
        emptyState ?? defaultEmptyState
      ) : (
        <div className="divide-y">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.03 }}
                className={cn("relative overflow-hidden", itemClassName)}
              >
                {/* Swipe background */}
                {item.swipeActions && (
                  <>
                    {/* Left action background */}
                    {item.swipeActions.left && (
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 flex items-center justify-center px-6",
                          item.swipeActions.left.variant === "destructive"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground",
                          swipeState.id === item.id && swipeState.direction === "left" && "w-full"
                        )}
                        style={{ width: swipeState.id === item.id && swipeState.direction === "left" ? "100%" : 0 }}
                      >
                        {item.swipeActions.left.icon}
                        <span className="ml-2 text-sm font-medium">{item.swipeActions.left.label}</span>
                      </div>
                    )}
                    {/* Right action background */}
                    {item.swipeActions.right && (
                      <div
                        className={cn(
                          "absolute inset-y-0 right-0 flex items-center justify-center px-6",
                          item.swipeActions.right.variant === "destructive"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground",
                          swipeState.id === item.id && swipeState.direction === "right" && "w-full"
                        )}
                        style={{ width: swipeState.id === item.id && swipeState.direction === "right" ? "100%" : 0 }}
                      >
                        {item.swipeActions.right.icon}
                        <span className="ml-2 text-sm font-medium">{item.swipeActions.right.label}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Item content */}
                <motion.div
                  drag={item.swipeActions ? "x" : false}
                  dragConstraints={{ left: item.swipeActions?.left ? -100 : 0, right: item.swipeActions?.right ? 100 : 0 }}
                  dragElastic={0.1}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -50 && item.swipeActions?.left) {
                      handleSwipe(item, "left")
                    } else if (info.offset.x > 50 && item.swipeActions?.right) {
                      handleSwipe(item, "right")
                    }
                  }}
                  onClick={item.onClick}
                  className={cn(
                    "bg-background flex items-center gap-3 px-4 py-3 min-h-[56px]",
                    item.onClick && "cursor-pointer active:bg-muted/50 transition-colors touch-target"
                  )}
                >
                  {/* Leading content */}
                  {item.leading && (
                    <div className="shrink-0">{item.leading}</div>
                  )}

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium truncate">{item.primary}</div>
                    {item.secondary && (
                      <div className="text-sm text-muted-foreground truncate">{item.secondary}</div>
                    )}
                    {item.tertiary && (
                      <div className="text-xs text-muted-foreground/70 truncate mt-0.5">{item.tertiary}</div>
                    )}
                  </div>

                  {/* Trailing content */}
                  {item.trailing && (
                    <div className="shrink-0">{item.trailing}</div>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Loading sentinel for infinite scroll */}
      {infiniteScrollEnabled && hasMore && (
        <div id="load-more-sentinel" className="flex justify-center py-4">
          {isLoading && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </motion.div>
  )
}

export default MobileList
