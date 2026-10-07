import { useEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

const FADE_DISTANCE = 96;
const LINE_DISTANCE = 12;
const INDICATOR_HEIGHT = 48;
const DAMPING = 0.14;

interface ResizeEdgeProps extends ComponentProps<"div"> {
  active?: boolean;
}

/**
 * Column-resize hit zone. A short accent segment tracks the cursor along the
 * edge and fades in with the cursor's horizontal proximity to it.
 */
export function ResizeEdge({
  active = false,
  className,
  children,
  ...props
}: ResizeEdgeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const proximity = useRef(0);
  const near = useRef(0);
  const targetY = useRef<number | null>(null);
  const currentY = useRef(0);
  const frame = useRef(0);

  function paint() {
    const boost = activeRef.current ? 1 : 0;
    if (indicatorRef.current)
      indicatorRef.current.style.opacity = String(
        Math.max(boost, proximity.current),
      );
    if (lineRef.current)
      lineRef.current.style.opacity = String(Math.max(boost, near.current));
  }

  useEffect(() => {
    activeRef.current = active;
    paint();
  }, [active]);

  useEffect(() => {
    function step() {
      frame.current = 0;
      const indicator = indicatorRef.current;
      if (!indicator || targetY.current === null) return;
      const delta = targetY.current - currentY.current;
      currentY.current =
        Math.abs(delta) < 0.1
          ? targetY.current
          : currentY.current + delta * DAMPING;
      indicator.style.translate = `0 ${currentY.current - INDICATOR_HEIGHT / 2}px`;
      if (currentY.current !== targetY.current)
        frame.current = requestAnimationFrame(step);
    }

    function onMove(e: PointerEvent) {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
      if (targetY.current === null) currentY.current = y;
      targetY.current = y;
      if (!frame.current) frame.current = requestAnimationFrame(step);

      const dx = Math.abs(e.clientX - (rect.left + rect.width / 2));
      const inside = e.clientY >= rect.top && e.clientY <= rect.bottom;
      const t = inside ? Math.max(0, 1 - dx / FADE_DISTANCE) : 0;
      proximity.current = t * t;
      near.current = inside ? Math.max(0, 1 - dx / LINE_DISTANCE) : 0;
      paint();
    }
    function onLeave() {
      proximity.current = 0;
      near.current = 0;
      paint();
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "flex w-4 cursor-col-resize touch-none justify-center outline-none select-none",
        className,
      )}
    >
      {children}
      <div
        ref={lineRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 -ml-px w-0.5 bg-foreground/20 opacity-0"
      />
      <div
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -ml-[1.5px] h-12 w-[3px] rounded-full bg-brand opacity-0"
      />
    </div>
  );
}
