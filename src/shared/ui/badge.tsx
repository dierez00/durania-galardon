import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow,background-color,border-color] [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary-hover",
        secondary: "border-brand-secondary/25 bg-secondary text-secondary-foreground [a&]:hover:bg-secondary-hover",
        accent: "border-highlight-border bg-highlight-bg text-highlight [a&]:hover:bg-highlight-bg/85",
        neutral: "border-tone-neutral-border bg-tone-neutral-bg text-tone-neutral [a&]:hover:bg-tone-neutral-bg/80",
        info: "border-info-border bg-info-bg text-info [a&]:hover:bg-info-bg/80",
        success: "border-success-border bg-success-bg text-success [a&]:hover:bg-success-bg/80",
        warning: "border-warning-border bg-warning-bg text-warning [a&]:hover:bg-warning-bg/80",
        error: "border-error-border bg-error-bg text-error [a&]:hover:bg-error-bg/80",
        destructive:
          "border-error-border bg-error-bg text-error [a&]:hover:bg-error-bg/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

export { Badge, badgeVariants, type BadgeVariant }
