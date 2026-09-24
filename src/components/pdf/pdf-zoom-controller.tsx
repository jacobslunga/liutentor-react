import { useScrollCapability } from "@embedpdf/plugin-scroll/react";
import { useViewportCapability } from "@embedpdf/plugin-viewport/react";
import { useZoomCapability, ZoomMode } from "@embedpdf/plugin-zoom/react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { ResetZoomContext } from "./pdf-zoom-context";

const EPSILON = 0.0005;

/**
 * Uses the stable capabilities rather than `useZoom`: that hook returns a new
 * scope object every render and re-renders on every zoom change, which would
 * feed back into the refit effects below.
 *
 * Keeps the document fitted to the available width, capped at `maxPageWidth`
 * when set. A zoom the user picked is scaled with the viewport instead of
 * being reset. Provides a reset function to its children.
 */
export function PdfZoomController({
  documentId,
  maxPageWidth,
  children,
}: {
  documentId: string;
  maxPageWidth: number | null;
  children?: ReactNode;
}) {
  const { provides: zoomCapability } = useZoomCapability();
  const { provides: viewport } = useViewportCapability();
  const { provides: scroll } = useScrollCapability();

  const lastApplied = useRef(0);
  const lastWidth = useRef(0);

  const availableWidth = useCallback((): number | null => {
    if (!viewport) return null;
    const width =
      viewport.forDocument(documentId).getMetrics().clientWidth - 2 * viewport.getViewportGap();
    return width > 0 ? width : null;
  }, [viewport, documentId]);

  const contentWidth = useCallback((): number | null => {
    if (!scroll) return null;
    const spreads = scroll.forDocument(documentId).getSpreadPagesWithRotatedSize();
    if (!spreads?.length) return null;

    const pageGap = scroll.getPageGap();
    let widest = 0;
    for (const spread of spreads) {
      const width = spread.reduce(
        (total, page, i) => total + page.rotatedSize.width + (i ? pageGap : 0),
        0,
      );
      widest = Math.max(widest, width);
    }
    return widest > 0 ? widest : null;
  }, [scroll, documentId]);

  const apply = useCallback(() => {
    const zoom = zoomCapability?.forDocument(documentId);
    if (!zoom) return;
    const available = availableWidth();
    if (!available) return;
    lastWidth.current = available;

    const content = maxPageWidth !== null && available > maxPageWidth ? contentWidth() : null;
    if (maxPageWidth === null || !content) {
      lastApplied.current = 0;
      zoom.requestZoom(ZoomMode.FitWidth);
      return;
    }

    lastApplied.current = maxPageWidth / content;
    zoom.requestZoom(lastApplied.current, { vx: 0, vy: 0 });
  }, [zoomCapability, documentId, availableWidth, contentWidth, maxPageWidth]);

  const scrollToTop = useCallback(() => {
    viewport?.forDocument(documentId).scrollTo({ x: 0, y: 0 });
  }, [viewport, documentId]);

  // Latest `apply` for event subscriptions that shouldn't resubscribe.
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  useEffect(() => {
    lastApplied.current = 0;
    lastWidth.current = 0;
  }, [documentId]);

  // Refit when the cap changes (e.g. switching layout mode).
  const isFirstApply = useRef(true);
  useEffect(() => {
    if (!viewport) return;
    apply();
    if (!isFirstApply.current) requestAnimationFrame(scrollToTop);
    isFirstApply.current = false;
  }, [apply, viewport, scrollToTop]);

  useEffect(() => {
    if (!scroll) return;
    return scroll.onLayoutReady((event) => {
      if (event.documentId !== documentId) return;
      applyRef.current();
      requestAnimationFrame(scrollToTop);
    });
  }, [scroll, documentId, scrollToTop]);

  // EmbedPDF only refits mode-based zoom; numeric zoom must scale with the viewport.
  useEffect(() => {
    if (!viewport || !zoomCapability) return;
    const zoom = zoomCapability.forDocument(documentId);
    return viewport.onViewportResize((event) => {
      if (event.documentId !== documentId) return;

      const width = availableWidth();
      if (!width) return;
      const previousWidth = lastWidth.current;
      if (Math.abs(width - previousWidth) < 1) return;
      lastWidth.current = width;

      const level = zoom.getState().zoomLevel;
      const isOurs =
        typeof level !== "number" ||
        (!!lastApplied.current && Math.abs(level - lastApplied.current) < EPSILON);

      if (isOurs) {
        applyRef.current();
      } else if (previousWidth) {
        const current = zoom.getState().currentZoomLevel;
        if (current) zoom.requestZoom(current * (width / previousWidth), { vx: 0, vy: 0 });
      }
    });
  }, [viewport, zoomCapability, documentId, availableWidth]);

  const reset = useCallback(() => {
    apply();
    requestAnimationFrame(scrollToTop);
  }, [apply, scrollToTop]);

  return <ResetZoomContext.Provider value={reset}>{children}</ResetZoomContext.Provider>;
}
