import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,opacity] disabled:pointer-events-none disabled:border-state-disabled-border disabled:bg-state-disabled-bg disabled:text-state-disabled-text [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-active",
        destructive:
          "border border-error-border bg-error-bg text-error shadow-xs hover:bg-error-bg/80 active:bg-error-bg/70 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-border bg-card text-foreground shadow-xs hover:border-brand-secondary/40 hover:bg-accent hover:text-accent-foreground active:bg-secondary",
        secondary:
          "border border-brand-secondary/25 bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary-hover active:bg-brand-secondary/25",
        accent:
          "border border-highlight-border bg-highlight-bg text-highlight shadow-xs hover:bg-highlight-bg/80 active:bg-highlight-bg/65",
        info:
          "border border-info-border bg-info-bg text-info shadow-xs hover:bg-info-bg/80 active:bg-info-bg/65",
        success:
          "border border-success-border bg-success-bg text-success shadow-xs hover:bg-success-bg/80 active:bg-success-bg/65",
        warning:
          "border border-warning-border bg-warning-bg text-warning shadow-xs hover:bg-warning-bg/80 active:bg-warning-bg/65",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
