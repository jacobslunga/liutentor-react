import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeyHint } from "./key-hint";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "aria-label"> & {
  "aria-label": string;

  shortcut?: string;

  hideTooltip?: boolean;
};

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
