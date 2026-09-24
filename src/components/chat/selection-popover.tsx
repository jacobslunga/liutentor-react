import { QuoteIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

/** "Ask" button floating above a text selection in the transcript. */
export function SelectionPopover({ x, y, onReply }: { x: number; y: number; onReply: () => void }) {
  return createPortal(
    <div
      className="fixed z-50 animate-in duration-150 fade-in-0"
      style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 8px))" }}
    >
      <Button
        variant="outline"
        onMouseDown={(e) => {
          // Keep the selection alive until we've read it.
          e.preventDefault();
          e.stopPropagation();
          onReply();
        }}
      >
        <QuoteIcon data-icon="inline-start" />
        Fråga
      </Button>
    </div>,
    document.body,
  );
}
