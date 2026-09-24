import { GripVerticalIcon } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  /** Called on every pointer move with the pointer's x; should write styles directly. */
  onResize: (clientX: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

/**
 * Vertical drag handle. Owns the drag lifecycle so only the handle re-renders
 * (for its highlight) at start and end; `onResize` runs outside React state.
 */
export function ResizeHandle({ onResize, onResizeStart, onResizeEnd }: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);

  function start(event: MouseEvent) {
    event.preventDefault();
    setIsResizing(true);
    onResizeStart?.();
    document.body.classList.add("select-none", "cursor-col-resize");

    let frame = 0;
    const move = (e: globalThis.MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => onResize(e.clientX));
    };
    const up = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.classList.remove("select-none", "cursor-col-resize");
      setIsResizing(false);
      onResizeEnd?.();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div
      className="group absolute inset-y-0 left-0 z-20 flex w-5 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center outline-none select-none"
      onMouseDown={start}
    >
      <div
        className={cn(
          "absolute inset-y-0 w-px transition-colors duration-200 group-hover:w-0.5",
          isResizing ? "bg-primary" : "bg-border group-hover:bg-primary/50",
        )}
      />
      <div
        className={cn(
          "relative flex h-8 w-4 items-center justify-center rounded-sm border bg-background shadow-md transition-colors duration-200 dark:bg-muted",
          isResizing ? "scale-110 border-primary" : "group-hover:border-primary/50",
        )}
      >
        <GripVerticalIcon
          className={cn("size-3.5", isResizing ? "text-primary" : "text-muted-foreground")}
        />
      </div>
    </div>
  );
}
