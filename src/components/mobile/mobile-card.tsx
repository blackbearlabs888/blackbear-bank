"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MobileCardProps {
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
  contentClassName?: string
  headerClassName?: string
  onClick?: () => void
}

export function MobileCard({
  title,
  description,
  children,
  footer,
  collapsible = false,
  defaultCollapsed = false,
  className,
  contentClassName,
  headerClassName,
  onClick,
}: MobileCardProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-card rounded-xl border shadow-sm overflow-hidden",
        "touch-target",
        onClick && "cursor-pointer active:scale-[0.99] transition-transform",
        className
      )}
      onClick={onClick}
    >
      {(title || collapsible) && (
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 min-h-[44px]",
            collapsible && "cursor-pointer active:bg-muted/50",
            headerClassName
          )}
          onClick={collapsible ? toggleCollapse : undefined}
        >
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-base font-semibold truncate">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground truncate">{description}</p>
            )}
          </div>
          {collapsible && (
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="ml-2 shrink-0"
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      )}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className={cn("px-4 py-3", contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {footer && !isCollapsed && (
        <div className="border-t px-4 py-3 min-h-[44px]">
          {footer}
        </div>
      )}
    </motion.div>
  )
}

export default MobileCard
