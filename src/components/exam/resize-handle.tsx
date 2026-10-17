import { GripVerticalIcon } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  onResize: (clientX: number) => void;
  constrainX?: (clientX: number) => number;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function ResizeHandle({
  onResize,
  constrainX = (x) => x,
  onResizeStart,
  onResizeEnd,
}: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  function start(event: MouseEvent) {
    event.preventDefault();
    cleanupRef.current?.();
    setIsResizing(true);
    onResizeStart?.();
    document.body.classList.add("select-none", "cursor-col-resize");

    let frame = 0;
    const move = (e: globalThis.MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => onResize(constrainX(e.clientX)));
    };
    const cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.classList.remove("select-none", "cursor-col-resize");
      cleanupRef.current = null;
    };
    const up = (e: globalThis.MouseEvent) => {
      cleanup();
      // Commit the release position, including the last move before a frame.
      onResize(constrainX(e.clientX));
      setIsResizing(false);
      onResizeEnd?.();
    };
    cleanupRef.current = cleanup;
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
          isResizing ? "bg-brand" : "bg-border group-hover:bg-brand/50",
        )}
      />
      <div
        className={cn(
          "relative flex h-8 w-4 items-center justify-center rounded-[6px] border bg-background shadow-md transition-colors duration-200 dark:bg-muted",
          isResizing ? "scale-110 border-brand" : "group-hover:border-brand/50",
        )}
      >
        <GripVerticalIcon
          className={cn(
            "size-3.5",
            isResizing ? "text-brand" : "text-muted-foreground",
          )}
        />
      </div>
    </div>
  );
}
