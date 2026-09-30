import { QuoteIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@primer/react";

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
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
    >
      <div className="animate-in duration-150 fade-in-0 zoom-in-95">
        <Button
          className="font-medium"
          leadingVisual={<QuoteIcon fill="currentColor" />}
          onMouseDown={(e) => {
            // Keep the selection alive until we've read it.
            e.preventDefault();
            e.stopPropagation();
            onReply();
          }}
        >
          Fråga
        </Button>
      </div>
    </div>,
    document.body,
  );
}
