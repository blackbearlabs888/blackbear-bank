"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface MobileFabAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export interface MobileFabProps {
  actions?: MobileFabAction[]
  onClick?: () => void
  icon?: React.ReactNode
  label?: string
  className?: string
  position?: "bottom-right" | "bottom-center" | "bottom-left"
  hideOnScroll?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  disabled?: boolean
}

export function MobileFab({
  actions,
  onClick,
  icon = <Plus className="h-6 w-6" />,
  label,
  className,
  position = "bottom-right",
  hideOnScroll = true,
  expanded: controlledExpanded,
  onExpandedChange,
  disabled = false,
}: MobileFabProps) {
  const [internalExpanded, setInternalExpanded] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(true)
  const lastScrollY = React.useRef(0)

  const expanded = controlledExpanded ?? internalExpanded
  const setExpanded = (value: boolean) => {
    setInternalExpanded(value)
    onExpandedChange?.(value)
  }

  // Hide on scroll behavior
  React.useEffect(() => {
    if (!hideOnScroll) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const diff = currentScrollY - lastScrollY.current

      if (diff > 10 && currentScrollY > 100) {
        setIsVisible(false)
        setExpanded(false)
      } else if (diff < -10) {
        setIsVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hideOnScroll, setExpanded])

  const hasMultipleActions = actions && actions.length > 1
  const hasSingleAction = onClick || (actions && actions.length === 1)

  const handleMainClick = () => {
    if (hasMultipleActions) {
      setExpanded(!expanded)
    } else if (hasSingleAction) {
      if (onClick) {
        onClick()
      } else if (actions && actions.length === 1) {
        actions[0].onClick()
      }
    }
  }

  const positionClasses = {
    "bottom-right": "right-4",
    "bottom-center": "left-1/2 -translate-x-1/2",
    "bottom-left": "left-4",
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className={cn(
            "fixed bottom-20 z-40 safe-area-bottom",
            positionClasses[position],
            className
          )}
        >
          {/* Action buttons */}
          {hasMultipleActions && (
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col-reverse gap-2 mb-2"
                >
                  {actions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        action.onClick()
                        setExpanded(false)
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg",
                        "bg-background border touch-target",
                        "hover:bg-muted active:scale-95 transition-all",
                        action.variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      )}
                    >
                      {action.icon}
                      <span className="text-sm font-medium">{action.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Main FAB */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMainClick}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-2 rounded-full shadow-lg",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 active:bg-primary/80",
              "transition-colors touch-target",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              hasMultipleActions ? "h-14 w-14" : "h-14 px-6",
              label && !hasMultipleActions && "pr-6 pl-5"
            )}
          >
            <motion.div
              animate={{ rotate: hasMultipleActions && expanded ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {hasMultipleActions && expanded ? <X className="h-6 w-6" /> : icon}
            </motion.div>
            {label && !hasMultipleActions && (
              <span className="text-sm font-medium">{label}</span>
            )}
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  )
}

export default MobileFab
