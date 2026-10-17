import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function SelectionPopover({
  x,
  y,
  onReply,
}: {
  x: number;
  y: number;
  onReply: () => void;
}) {
  return createPortal(
    <div
      className="fixed z-50"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, 8px)",
      }}
    >
      <div className="animate-in duration-150 fade-in-0 zoom-in-95">
        <Button
          variant="outline"
          className="h-8 rounded-lg border-border/70 bg-popover px-2.5 text-sm font-normal text-popover-foreground shadow-[0_2px_8px_oklch(0_0_0/0.08)] hover:bg-accent"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReply();
          }}
        >
          Fråga LiU Tentor
        </Button>
      </div>
    </div>,
    document.body,
  );
}
