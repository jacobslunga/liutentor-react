import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 motion-reduce:transition-none motion-reduce:active:scale-100 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 keyboard-focus:border-ring keyboard-focus:ring-3 keyboard-focus:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground inset-shadow-sheen hover:from-white/24 dark:from-white/40 dark:hover:from-white/55`,
        outline: `border-border bg-card hover:to-foreground/[0.07] aria-expanded:to-foreground/[0.07] dark:border-input dark:from-white/[0.06] dark:to-transparent dark:hover:from-white/10`,
        secondary: `bg-secondary text-secondary-foreground hover:to-foreground/[0.08] aria-expanded:to-foreground/[0.08] dark:from-white/[0.06] dark:to-transparent`,
        ghost:
          "hover:bg-muted hover:text-foreground active:scale-[0.97] aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-accent dark:aria-expanded:bg-accent",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98] dark:bg-destructive/20 dark:hover:bg-destructive/30 keyboard-focus:border-destructive/40 keyboard-focus:ring-destructive/20 dark:keyboard-focus:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-[0.8125rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-3.5 text-[0.9375rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
