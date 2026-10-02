import { createLink } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import type { AnchorHTMLAttributes, Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof buttonVariants> & { ref?: Ref<HTMLAnchorElement> };

/** An anchor styled as a shadcn Button, for external and mailto links. */
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/** shadcn-styled button that navigates with TanStack Router (typed `to`/`params`). */
export const RouterLinkButton = createLink(ButtonLink);
