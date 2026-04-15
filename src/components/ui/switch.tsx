"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    size?: "sm" | "md"
  }
>(({ className, size = "md", ...props }, ref) => {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      data-slot="switch"
      className={cn(
        "group peer inline-flex shrink-0 items-center rounded-full outline-none transition-all duration-200 ease-out",
        "focus-visible:ring-2 focus-visible:ring-green-500/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40",
        /* Track: OFF = muted gray, ON = green */
        "bg-gray-200 dark:bg-gray-600",
        "group-data-[state=checked]:bg-green-500",
        "hover:bg-gray-300 dark:hover:bg-gray-500",
        "group-data-[state=checked]:hover:bg-green-600",
        "active:scale-[0.97]",
        size === "sm" ? "h-4 w-7" : "h-[18px] w-8",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative flex items-center justify-center rounded-full transition-all duration-200 ease-out",
          /* Thumb: OFF = white, ON = white */
          "bg-white shadow-sm",
          size === "sm"
            ? "size-[14px] group-data-[state=checked]:translate-x-[12px]"
            : "size-4 group-data-[state=checked]:translate-x-[14px]"
        )}
      >
        {/* ON: checkmark icon (green) */}
        <Check
          className={cn(
            "absolute text-green-500 opacity-0 scale-50 transition-all duration-200",
            "group-data-[state=checked]:opacity-100 group-data-[state=checked]:scale-100",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
          )}
          strokeWidth={3}
        />
        {/* OFF: minus icon (gray) */}
        <Minus
          className={cn(
            "absolute text-gray-400 opacity-100 scale-100 transition-all duration-200",
            "group-data-[state=checked]:opacity-0 group-data-[state=checked]:scale-50",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
          )}
          strokeWidth={3}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
})
Switch.displayName = "Switch"

/* Toggle Field — Switch with Label */
function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
  size = "md",
  disabled = false,
  className,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  size?: "sm" | "md"
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium leading-tight",
          disabled ? "text-muted-foreground" : "text-foreground",
          size === "sm" ? "text-xs" : "text-[13px]"
        )}>
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <Switch size={size} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

export { Switch, ToggleField }
