import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { useEffect } from "react";
import { normalizePdfText } from "@/lib/pdf-text";

/** Cmd/Ctrl+C copies the PDF text selection with Swedish diacritics repaired. */
export function PdfCopyShortcut() {
  const { provides: selection } = useSelectionCapability();

  useEffect(() => {
    if (!selection) return;

    let hasSelection = false;
    const off = selection.onSelectionChange((sel) => {
      hasSelection = !!sel;
    });

    async function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "c" || !hasSelection) return;
      if (!selection) return;
      e.preventDefault();
      try {
        const pages = await selection.getSelectedText().toPromise();
        await navigator.clipboard.writeText(normalizePdfText(pages.join("\n")));
      } catch {
        selection.copyToClipboard();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      off();
    };
  }, [selection]);

  return null;
}
