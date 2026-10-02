import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeyHint } from "./key-hint";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "aria-label"> & {
  /** Accessible name, also shown as the tooltip. */
  "aria-label": string;
  /** A shortcut such as "Mod+." shown next to the tooltip label. */
  shortcut?: string;
  /** Skip the tooltip, e.g. when the label is already visible nearby. */
  hideTooltip?: boolean;
};

/** Icon-only shadcn Button whose label shows as a tooltip on hover and focus. */
export function IconButton({
  shortcut,
  hideTooltip,
  variant = "ghost",
  size = "icon",
  ...props
}: IconButtonProps) {
  const button = <Button variant={variant} size={size} {...props} />;
  if (hideTooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {props["aria-label"]}
        {shortcut && <KeyHint keys={shortcut} />}
      </TooltipContent>
    </Tooltip>
  );
}
