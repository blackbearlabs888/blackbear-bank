"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, GripHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface MobileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  fullscreen?: boolean
  showCloseButton?: boolean
  className?: string
}

export function MobileDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  fullscreen = false,
  showCloseButton = true,
  className,
}: MobileDialogProps) {
  // Lock body scroll when dialog is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Dialog Content */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed z-50 bg-background flex flex-col",
              "safe-area-bottom",
              fullscreen
                ? "inset-0"
                : "inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh] border-t shadow-lg",
              className
            )}
          >
            {/* Drag Handle */}
            {!fullscreen && (
              <div
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  const startY = e.clientY
                  const handleMove = (moveEvent: PointerEvent) => {
                    const diff = moveEvent.clientY - startY
                    if (diff > 100) {
                      onOpenChange(false)
                      document.removeEventListener("pointermove", handleMove)
                      document.removeEventListener("pointerup", handleUp)
                    }
                  }
                  const handleUp = () => {
                    document.removeEventListener("pointermove", handleMove)
                    document.removeEventListener("pointerup", handleUp)
                  }
                  document.addEventListener("pointermove", handleMove)
                  document.addEventListener("pointerup", handleUp)
                }}
              >
                <GripHorizontal className="h-6 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-2 border-b min-h-[52px]">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className="text-lg font-semibold truncate">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground truncate">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 touch-target"
                    onClick={() => onOpenChange(false)}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default MobileDialog
