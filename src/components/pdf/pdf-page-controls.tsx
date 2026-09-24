import { useRotate } from "@embedpdf/plugin-rotate/react";
import { useZoom, ZoomMode } from "@embedpdf/plugin-zoom/react";
import { MinusIcon, PlusIcon, RotateCwIcon } from "lucide-react";
import { useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ResetZoomContext, useLiveZoomScale } from "./pdf-zoom-context";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 10;
const EPSILON = 0.001;

/** Desktop zoom/rotate pill. Faint until the PDF is hovered. */
export function PdfPageControls({ documentId, className }: { documentId: string; className?: string }) {
  const { state, provides: zoom } = useZoom(documentId);
  const { provides: rotate } = useRotate(documentId);
  const resetZoom = useContext(ResetZoomContext);
  const liveScale = useLiveZoomScale();

  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const currentZoom = state.currentZoomLevel ?? 1;
  const canZoomIn = currentZoom < MAX_ZOOM - EPSILON;
  const canZoomOut = currentZoom > MIN_ZOOM + EPSILON;
  const displayValue = draft ?? `${Math.round(currentZoom * liveScale * 100)}%`;

  function commit() {
    const raw = draft;
    setDraft(null);
    if (raw === null) return;

    const parsed = Number.parseFloat(raw.replace(",", ".").replace("%", ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      if (resetZoom) resetZoom();
      else zoom?.requestZoom(ZoomMode.FitWidth);
      return;
    }
    zoom?.requestZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parsed / 100)));
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-0.5 rounded-full border bg-background/80 p-0.5 opacity-20 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover/pdf:opacity-70 hover:opacity-100 has-focus-visible:opacity-100",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="Zooma ut"
        disabled={!canZoomOut}
        onClick={() => zoom?.zoomOut()}
      >
        <MinusIcon />
      </Button>

      <input
        ref={inputRef}
        value={displayValue}
        type="text"
        inputMode="numeric"
        aria-label="Zoomnivå i procent"
        className="w-12 rounded-full bg-transparent py-1 text-center text-xs text-muted-foreground tabular-nums transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground focus:outline-none"
        onFocus={() => {
          setDraft(String(Math.round(currentZoom * 100)));
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.blur();
          if (e.key === "Escape") {
            setDraft(null);
            // Skip the commit on the blur that follows.
            requestAnimationFrame(() => inputRef.current?.blur());
          }
        }}
      />

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="Zooma in"
        disabled={!canZoomIn}
        onClick={() => zoom?.zoomIn()}
      >
        <PlusIcon />
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-5!" />

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="Rotera medurs"
        onClick={() => rotate?.rotateForward()}
      >
        <RotateCwIcon />
      </Button>
    </div>
  );
}

/** Mobile zoom/rotate bar. */
export function PdfZoomControls({ documentId, className }: { documentId: string; className?: string }) {
  const { state, provides: zoom } = useZoom(documentId);
  const { provides: rotate } = useRotate(documentId);

  const currentZoom = state.currentZoomLevel ?? 1;

  return (
    <div
      className={cn(
        "flex items-center overflow-hidden rounded-xl border bg-background/95 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon-lg"
        className="size-10 rounded-none"
        aria-label="Zooma in"
        disabled={currentZoom >= MAX_ZOOM - EPSILON}
        onClick={() => zoom?.zoomIn()}
      >
        <PlusIcon />
      </Button>
      <Separator orientation="vertical" className="h-5!" />
      <Button
        variant="ghost"
        size="icon-lg"
        className="size-10 rounded-none"
        aria-label="Zooma ut"
        disabled={currentZoom <= MIN_ZOOM + EPSILON}
        onClick={() => zoom?.zoomOut()}
      >
        <MinusIcon />
      </Button>
      <Separator orientation="vertical" className="h-5!" />
      <Button
        variant="ghost"
        size="icon-lg"
        className="size-10 rounded-none"
        aria-label="Rotera medurs"
        disabled={!rotate}
        onClick={() => rotate?.rotateForward()}
      >
        <RotateCwIcon />
      </Button>
    </div>
  );
}
