import { ReplyIcon } from "lucide-react";
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
          className="h-9 gap-2 border-white/10 bg-foreground px-3 text-sm font-medium text-background shadow-[0_4px_12px_oklch(0_0_0/0.25)] hover:bg-foreground hover:opacity-90"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReply();
          }}
        >
          Fråga LiU Tentor
          <ReplyIcon />
        </Button>
      </div>
    </div>,
    document.body,
  );
}
