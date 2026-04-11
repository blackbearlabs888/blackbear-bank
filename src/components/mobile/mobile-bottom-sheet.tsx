"use client"

import * as React from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { GripHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

export type SnapPoint = 0.25 | 0.5 | 0.9

export interface MobileBottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  snapPoint?: SnapPoint
  onSnapPointChange?: (snapPoint: SnapPoint) => void
  defaultSnapPoint?: SnapPoint
  className?: string
  contentClassName?: string
  backdropBlur?: boolean
  showHandle?: boolean
}

export function MobileBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  snapPoint,
  onSnapPointChange,
  defaultSnapPoint = 0.5,
  className,
  contentClassName,
  backdropBlur = true,
  showHandle = true,
}: MobileBottomSheetProps) {
  const [currentSnap, setCurrentSnap] = React.useState<SnapPoint>(snapPoint ?? defaultSnapPoint)
  const dragControls = useDragControls()
  const sheetRef = React.useRef<HTMLDivElement>(null)

  // Sync controlled snap point
  React.useEffect(() => {
    if (snapPoint !== undefined) {
      setCurrentSnap(snapPoint)
    }
  }, [snapPoint])

  // Lock body scroll when sheet is open
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

  const snapPoints: SnapPoint[] = [0.25, 0.5, 0.9]
  const getHeight = (snap: SnapPoint) => `${snap * 100}vh`

  const handleDragEnd = (_: unknown, info: { offset: { y: number }, velocity: { y: number } }) => {
    const threshold = 50
    const velocity = info.velocity.y
    const offset = info.offset.y

    // Close on fast downward swipe or large drag
    if (velocity > 500 || offset > 200) {
      onOpenChange(false)
      return
    }

    // Snap to nearest point
    const sheetHeight = window.innerHeight * currentSnap
    const newOffset = sheetHeight - offset
    
    // Find closest snap point
    let closestSnap: SnapPoint = currentSnap
    let minDiff = Infinity
    
    for (const snap of snapPoints) {
      const snapHeight = window.innerHeight * snap
      const diff = Math.abs(newOffset - snapHeight)
      if (diff < minDiff) {
        minDiff = diff
        closestSnap = snap
      }
    }

    setCurrentSnap(closestSnap)
    onSnapPointChange?.(closestSnap)
  }

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
            className={cn(
              "fixed inset-0 z-50 bg-black/50",
              backdropBlur && "backdrop-blur-sm"
            )}
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet Content */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: `${(1 - currentSnap) * 100}%` }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl border-t shadow-lg",
              "safe-area-bottom flex flex-col",
              className
            )}
            style={{ height: getHeight(0.9) }}
          >
            {/* Handle */}
            {showHandle && (
              <div
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <GripHorizontal className="h-6 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="px-4 pb-3 shrink-0">
                {title && (
                  <h2 className="text-lg font-semibold">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            )}

            {/* Content */}
            <div className={cn("flex-1 overflow-y-auto overscroll-contain", contentClassName)}>
              {children}
            </div>

            {/* Snap indicators */}
            <div className="flex justify-center gap-2 py-2 shrink-0">
              {snapPoints.map((snap) => (
                <button
                  key={snap}
                  onClick={() => {
                    setCurrentSnap(snap)
                    onSnapPointChange?.(snap)
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all touch-target min-w-[24px]",
                    currentSnap === snap
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 w-3 hover:bg-muted-foreground/50"
                  )}
                  aria-label={`Snap to ${snap * 100}%`}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default MobileBottomSheet
