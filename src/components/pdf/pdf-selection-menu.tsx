import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { ArrowUpRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SELECTION_LENGTH = 4000;

interface PdfSelectionMenuProps {
  documentId: string;
  above: boolean;
  onExplain: (text: string) => void;
}

export function PdfSelectionMenu({ documentId, above, onExplain }: PdfSelectionMenuProps) {
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
      // Selection vanished mid-request; nothing to explain.
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isResolving}
      className={cn(
        "pointer-events-auto absolute left-1/2 -translate-x-1/2 animate-in whitespace-nowrap shadow-sm duration-150 fade-in-0 select-none",
        above ? "bottom-full mb-2" : "top-full mt-2",
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        void explain();
      }}
    >
      Förklara
      <ArrowUpRightIcon data-icon="inline-end" />
    </Button>
  );
}
