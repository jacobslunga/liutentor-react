import { useViewportElement } from "@embedpdf/plugin-viewport/react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

interface Metrics {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  trackWidth: number;
}

/**
 * A visible horizontal scrollbar for zoomed-in pages (native ones are thin or
 * hidden on most platforms). Only this component re-renders while scrolling.
 */
export function PdfScrollbars() {
  const viewportRef = useViewportElement();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; scroll: number } | null>(null);
  const [m, setMetrics] = useState<Metrics>({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
    trackWidth: 0,
  });

  const maximum = Math.max(0, m.scrollWidth - m.clientWidth);
  const thumbWidth = Math.min(
    m.trackWidth,
    Math.max(40, (m.trackWidth * m.clientWidth) / (m.scrollWidth || 1)),
  );
  const travel = m.trackWidth - thumbWidth;
  const thumbLeft = maximum ? (m.scrollLeft / maximum) * travel : 0;
  const visible = maximum > 1;

  useEffect(() => {
    const el = viewportRef?.current;
    if (!el) return;

    const update = () => {
      const next = {
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        trackWidth: trackRef.current?.clientWidth ?? 0,
      };
      setMetrics((prev) =>
        prev.scrollLeft === next.scrollLeft &&
        prev.scrollWidth === next.scrollWidth &&
        prev.clientWidth === next.clientWidth &&
        prev.trackWidth === next.trackWidth
          ? prev
          : next,
      );
    };

    const resize = new ResizeObserver(update);
    const observeContent = () => {
      resize.disconnect();
      resize.observe(el);
      for (const child of el.children) resize.observe(child);
      if (trackRef.current) resize.observe(trackRef.current);
      update();
    };
    const mutations = new MutationObserver(observeContent);
    mutations.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    el.addEventListener("scroll", update, { passive: true });
    observeContent();

    return () => {
      resize.disconnect();
      mutations.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [viewportRef, visible]);

  if (!visible) return null;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    const el = viewportRef?.current;
    if (event.button !== 0 || !track || !el) return;
    event.preventDefault();
    if (event.target === track) {
      const x = event.clientX - track.getBoundingClientRect().left;
      el.scrollTo({ left: Math.max(0, Math.min(1, (x - thumbWidth / 2) / (travel || 1))) * maximum });
    }
    drag.current = { pointerId: event.pointerId, x: event.clientX, scroll: el.scrollLeft };
    track.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const el = viewportRef?.current;
    if (!drag.current || drag.current.pointerId !== event.pointerId || !el) return;
    el.scrollTo({
      left: drag.current.scroll + ((event.clientX - drag.current.x) / (travel || 1)) * maximum,
    });
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const el = viewportRef?.current;
    if (!el) return;
    const positions: Record<string, number> = {
      ArrowLeft: el.scrollLeft - 80,
      ArrowRight: el.scrollLeft + 80,
      Home: 0,
      End: maximum,
      PageUp: el.scrollLeft - el.clientWidth,
      PageDown: el.scrollLeft + el.clientWidth,
    };
    const position = positions[event.key];
    if (position === undefined) return;
    event.preventDefault();
    el.scrollTo({ left: position });
  }

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div
      ref={trackRef}
      role="scrollbar"
      tabIndex={0}
      aria-label="Rulla PDF i sidled"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={Math.round(maximum)}
      aria-valuenow={Math.round(m.scrollLeft)}
      className="absolute inset-x-4 bottom-[env(safe-area-inset-bottom,0px)] z-40 h-4 touch-none rounded-full border bg-muted shadow-sm select-none focus-visible:outline-2 focus-visible:outline-ring"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={handleKey}
    >
      <div
        className="absolute inset-y-0.5 cursor-grab rounded-full bg-muted-foreground active:cursor-grabbing"
        style={{ width: `${thumbWidth}px`, left: `${thumbLeft}px` }}
      />
    </div>
  );
}
