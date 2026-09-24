import { useViewportElement } from "@embedpdf/plugin-viewport/react";
import { useContext, useEffect } from "react";
import { LiveZoomContext } from "./pdf-zoom-context";

const WHEEL_PIXELS_PER_NOTCH = 100;
const WHEEL_LINES_PER_NOTCH = 3;
const MAX_NOTCHES_PER_EVENT = 3;
const ZOOM_PER_NOTCH = 0.105;
/** Pixel deltas at or above this come from a mouse wheel, not a trackpad. */
const MOUSE_NOTCH_DELTA_THRESHOLD = 40;

function isMouseNotch(event: WheelEvent) {
  return (
    event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
    Math.abs(event.deltaY) >= MOUSE_NOTCH_DELTA_THRESHOLD
  );
}

function wheelNotches(event: WheelEvent) {
  switch (event.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return event.deltaY / WHEEL_LINES_PER_NOTCH;
    case WheelEvent.DOM_DELTA_PAGE:
      return event.deltaY;
    default:
      return event.deltaY / WHEEL_PIXELS_PER_NOTCH;
  }
}

function gestureScale(el: HTMLElement) {
  const transform = el.style.transform;
  if (!transform || transform === "none") return 1;
  try {
    return new DOMMatrix(transform).a || 1;
  } catch {
    return 1;
  }
}

/**
 * Ctrl/Cmd+wheel zoom tuning, rendered inside the Viewport.
 *
 * - Mouse-wheel notches are re-dispatched as a normalized pixel delta so each
 *   notch zooms by the same factor on every platform (trackpads pass through).
 * - The gesture element's CSS transform is mirrored into the live zoom store
 *   so the zoom label tracks the preview before EmbedPDF commits the level.
 *
 * Attached natively: React registers wheel listeners as passive, and this one
 * must be able to preventDefault in the capture phase.
 */
export function PdfWheelZoom() {
  const viewportRef = useViewportElement();
  const liveZoom = useContext(LiveZoomContext);

  useEffect(() => {
    const viewport = viewportRef?.current;
    if (!viewport) return;

    const normalized = new WeakSet<WheelEvent>();
    let gestureEl: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    function observeGesture() {
      if (gestureEl?.isConnected || !liveZoom) return;
      const el = viewport!.querySelector<HTMLElement>(".pdf-zoom-gesture");
      if (!el) return;
      observer?.disconnect();
      gestureEl = el;
      liveZoom.set(gestureScale(el));
      observer = new MutationObserver(() => liveZoom.set(gestureScale(el)));
      observer.observe(el, { attributes: true, attributeFilter: ["style"] });
    }

    function onWheel(event: WheelEvent) {
      if (normalized.has(event)) return;
      if (!event.ctrlKey && !event.metaKey) return;
      observeGesture();
      if (!isMouseNotch(event)) return;

      const notches = Math.max(
        -MAX_NOTCHES_PER_EVENT,
        Math.min(MAX_NOTCHES_PER_EVENT, wheelNotches(event)),
      );
      if (!notches) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const zoomFactor = Math.exp(-ZOOM_PER_NOTCH * notches);
      const synthetic = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        deltaX: 0,
        deltaY: (1 - zoomFactor) / 0.01,
      });
      normalized.add(synthetic);
      viewport!.dispatchEvent(synthetic);
    }

    viewport.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel, { capture: true });
      observer?.disconnect();
    };
  }, [viewportRef, liveZoom]);

  return null;
}
