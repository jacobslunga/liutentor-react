import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Raised buttons: a top-lit gradient over the fill, a 1px highlight, and a
// soft shadow. Hover lifts them 1px; press sinks and squeezes them a touch.
const raised =
  "shadow-raised hover:-translate-y-px hover:shadow-raised-hover active:translate-y-0 active:scale-[0.98] active:shadow-raised-pressed aria-expanded:translate-y-0 aria-expanded:shadow-raised-pressed"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-[translate,scale,box-shadow,background-color,color,border-color,--tw-gradient-from,--tw-gradient-to] duration-150 ease-snap active:duration-75 active:ease-out-quick focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: `bg-primary bg-linear-to-b from-white/16 to-transparent text-primary-foreground inset-shadow-sheen hover:from-white/24 dark:from-white/40 dark:hover:from-white/55 ${raised}`,
        outline: `border-border bg-card bg-linear-to-b from-transparent to-foreground/[0.04] inset-shadow-highlight hover:to-foreground/[0.07] aria-expanded:to-foreground/[0.07] dark:border-input dark:from-white/[0.06] dark:to-transparent dark:hover:from-white/10 ${raised}`,
        secondary: `bg-secondary bg-linear-to-b from-transparent to-foreground/[0.04] text-secondary-foreground inset-shadow-highlight hover:to-foreground/[0.08] aria-expanded:to-foreground/[0.08] dark:from-white/[0.06] dark:to-transparent ${raised}`,
        ghost:
          "hover:bg-muted hover:text-foreground active:scale-[0.97] aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98] focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-sm px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[0.8125rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 text-[0.9375rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3",
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
