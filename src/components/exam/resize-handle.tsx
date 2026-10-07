import { useState, type MouseEvent } from "react";
import { ResizeEdge } from "@/components/shared/resize-edge";

interface ResizeHandleProps {
  onResize: (clientX: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function ResizeHandle({
  onResize,
  onResizeStart,
  onResizeEnd,
}: ResizeHandleProps) {
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
    <ResizeEdge
      active={isResizing}
      className="absolute inset-y-0 left-0 z-20 -translate-x-1/2"
      onMouseDown={start}
    >
      <div className="absolute inset-y-0 w-px" />
    </ResizeEdge>
  );
}
