"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        default: 
          "bg-muted/50 hover:bg-muted hover:text-foreground " +
          "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md " +
          "dark:bg-muted/30 dark:hover:bg-muted/50 dark:data-[state=on]:bg-primary dark:data-[state=on]:text-primary-foreground",
        outline:
          "border-2 border-input bg-transparent shadow-sm " +
          "hover:bg-accent/50 hover:text-accent-foreground hover:border-accent " +
          "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:border-accent data-[state=on]:shadow-md " +
          "dark:border-input/50 dark:hover:bg-accent/20 dark:data-[state=on]:bg-accent dark:data-[state=on]:text-accent-foreground",
        ghost:
          "bg-transparent hover:bg-muted/70 hover:text-foreground " +
          "data-[state=on]:bg-muted data-[state=on]:text-foreground " +
          "dark:hover:bg-muted/30 dark:data-[state=on]:bg-muted/50",
        elevated:
          "bg-muted/80 shadow-sm hover:bg-muted hover:shadow-md " +
          "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-lg " +
          "dark:bg-muted/40 dark:hover:bg-muted/60 dark:data-[state=on]:bg-primary",
      },
      size: {
        default: "h-9 px-3 min-w-9",
        sm: "h-8 px-2.5 min-w-8 text-xs",
        lg: "h-10 px-4 min-w-10 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
