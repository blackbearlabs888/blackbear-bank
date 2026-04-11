"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface MobilePageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  showBack?: boolean
  onBack?: () => void
  className?: string
  sticky?: boolean
}

export function MobilePageHeader({
  title,
  description,
  action,
  showBack = false,
  onBack,
  className,
  sticky = true,
}: MobilePageHeaderProps) {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    if (!sticky) return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [sticky])

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top",
        sticky && "sticky top-0",
        isScrolled && "border-b shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 touch-target"
              onClick={onBack}
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>
    </motion.header>
  )
}

export default MobilePageHeader
