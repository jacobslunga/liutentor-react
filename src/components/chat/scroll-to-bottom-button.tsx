import { ArrowDownIcon } from "lucide-react";
import { IconButton } from "@/components/shared/icon-button";
import { cn } from "@/lib/utils";

export function ScrollToBottomButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      size="icon-lg"
      variant="outline"
      className={cn(
        "group absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-[opacity,scale] duration-250 ease-snap motion-reduce:transition-none",
        visible
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-50 opacity-0",
      )}
      aria-label="Scrolla längst ned"
      hideTooltip
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={onClick}
    >
      <ArrowDownIcon className="text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
    </IconButton>
  );
}
