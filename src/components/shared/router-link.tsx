import { createLink } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import type { AnchorHTMLAttributes, Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof buttonVariants> & { ref?: Ref<HTMLAnchorElement> };

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

// oxlint-disable-next-line react/only-export-components -- createLink returns a React component.
export const RouterLinkButton = createLink(ButtonLink);
