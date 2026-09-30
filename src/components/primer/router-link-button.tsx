import { IconButton, LinkButton, type IconButtonProps } from "@primer/react";
import { createLink } from "@tanstack/react-router";
import { forwardRef, type AnchorHTMLAttributes } from "react";

/** Primer LinkButton that navigates with TanStack Router (typed `to`/`params`). */
export const RouterLinkButton = createLink(LinkButton);

const IconLinkButton = forwardRef<
  HTMLAnchorElement,
  IconButtonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "aria-label">
>(function IconLinkButton(props, ref) {
  return <IconButton as="a" ref={ref} {...props} />;
});

/** Icon-only Primer button that navigates with TanStack Router. */
export const RouterLinkIconButton = createLink(IconLinkButton);
