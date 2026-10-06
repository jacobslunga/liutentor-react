import { CornerUpRight } from "lucide-react";
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
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReply();
          }}
        >
          <CornerUpRight />
          Fråga om detta
        </Button>
      </div>
    </div>,
    document.body,
  );
}
