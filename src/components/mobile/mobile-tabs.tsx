"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface MobileTabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
  disabled?: boolean
}

export interface MobileTabsProps {
  tabs: MobileTabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
  className?: string
  tabsClassName?: string
  contentClassName?: string
  scrollable?: boolean
  variant?: "pills" | "underline" | "segmented"
}

export function MobileTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
  tabsClassName,
  contentClassName,
  scrollable = true,
  variant = "underline",
}: MobileTabsProps) {
  const tabsRef = React.useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 })

  React.useEffect(() => {
    if (variant !== "underline" || !tabsRef.current) return

    const activeIndex = tabs.findIndex(tab => tab.id === activeTab)
    if (activeIndex === -1) return

    const tabButtons = tabsRef.current.querySelectorAll("[data-tab-button]")
    const activeButton = tabButtons[activeIndex] as HTMLElement

    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      })
    }
  }, [activeTab, tabs, variant])

  const renderTabs = () => (
    <div
      ref={tabsRef}
      className={cn(
        "flex",
        variant === "pills" && "gap-2 p-1 bg-muted rounded-lg",
        variant === "segmented" && "gap-1 p-1 bg-muted rounded-lg",
        variant === "underline" && "border-b relative",
        scrollable && "overflow-x-auto scrollbar-hide",
        tabsClassName
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-button
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
          className={cn(
            "flex items-center justify-center gap-2 shrink-0 transition-colors",
            "min-h-[44px] px-4 py-2 text-sm font-medium",
            "touch-target",
            variant === "underline" && [
              "relative z-10",
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            ],
            variant === "pills" && [
              "rounded-md flex-1",
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ],
            variant === "segmented" && [
              "rounded-md flex-1",
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ],
            tab.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span className="truncate">{tab.label}</span>
          {tab.badge !== undefined && (
            <span className={cn(
              "shrink-0 px-1.5 py-0.5 text-xs rounded-full font-medium",
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}

      {/* Underline indicator */}
      {variant === "underline" && (
        <motion.div
          className="absolute bottom-0 h-0.5 bg-primary rounded-full"
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </div>
  )

  return (
    <div className={cn("flex flex-col", className)}>
      {scrollable ? (
        <ScrollArea className="w-full">
          {renderTabs()}
        </ScrollArea>
      ) : (
        renderTabs()
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className={cn("flex-1 mt-4", contentClassName)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default MobileTabs
