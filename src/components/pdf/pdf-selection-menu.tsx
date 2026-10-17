import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat-limits";
import { Button } from "@/components/ui/button";

const MAX_SELECTION_LENGTH = MAX_CHAT_MESSAGE_LENGTH;

interface PdfSelectionMenuProps {
  documentId: string;
  above: boolean;
  onExplain: (text: string) => void;
}

export function PdfSelectionMenu({
  documentId,
  above,
  onExplain,
}: PdfSelectionMenuProps) {
  const { provides: selection } = useSelectionCapability();
  const [isResolving, setIsResolving] = useState(false);

  async function explain() {
    if (!selection || isResolving) return;
    setIsResolving(true);
    try {
      const pages = await selection.getSelectedText(documentId).toPromise();
      const text = pages.join("\n").trim();
      if (!text) return;
      onExplain(text.slice(0, MAX_SELECTION_LENGTH));
      selection.clear(documentId);
    } catch {
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <Button
      variant="outline"
      disabled={isResolving}
      className={cn(
        "pointer-events-auto absolute left-1/2 h-8 -translate-x-1/2 animate-in rounded-lg border-border/70 bg-popover px-2.5 text-sm font-normal whitespace-nowrap text-popover-foreground shadow-[0_2px_8px_oklch(0_0_0/0.08)] duration-150 fade-in-0 select-none hover:bg-accent",
        above ? "bottom-full mb-2" : "top-full mt-2",
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        void explain();
      }}
    >
      Förklara
    </Button>
  );
}
