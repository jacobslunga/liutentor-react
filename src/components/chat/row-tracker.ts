import type { RefObject } from "react";

/** How far outside the scroller's viewport a row still counts as near. */
const NEAR_MARGIN = "2000px 0px";

/**
 * Tracks transcript rows against the chat's scroll container:
 *
 * - Near/far: rows far outside the viewport can drop their content (a spacer
 *   at their measured height stands in), so long chats keep a small DOM and
 *   only parse markdown for replies someone scrolls to.
 * - Anchoring: when a row above the viewport changes height (a spacer turns
 *   into its content, an image loads), the scroll position moves by the same
 *   amount so what you are reading stays put. Done by hand because Safari has
 *   no native scroll anchoring; the native one is turned off to avoid
 *   correcting twice.
 */
export class RowTracker {
  private io: IntersectionObserver | null = null;
  private readonly ro: ResizeObserver;
  private readonly heights = new WeakMap<Element, number>();
  private readonly listeners = new Map<Element, (near: boolean) => void>();
  private readonly scrollRef: RefObject<HTMLElement | null>;

  constructor(scrollRef: RefObject<HTMLElement | null>) {
    this.scrollRef = scrollRef;
    this.ro = new ResizeObserver(this.onResize);
  }

  /** Starts near/far tracking once the scroll container exists. */
  connect() {
    const root = this.scrollRef.current;
    if (!root) return;
    root.style.overflowAnchor = "none";
    this.io = new IntersectionObserver(this.onIntersect, {
      root,
      rootMargin: NEAR_MARGIN,
    });
    for (const el of this.listeners.keys()) this.io.observe(el);
  }

  disconnect() {
    this.io?.disconnect();
    this.io = null;
    this.ro.disconnect();
  }

  /** Follows one row; `onNear` reports whether it is close to the viewport. */
  observe(el: Element, onNear: (near: boolean) => void) {
    this.listeners.set(el, onNear);
    this.ro.observe(el);
    this.io?.observe(el);
    return () => {
      this.listeners.delete(el);
      this.ro.unobserve(el);
      this.io?.unobserve(el);
    };
  }

  private onIntersect = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries)
      this.listeners.get(entry.target)?.(entry.isIntersecting);
  };

  private onResize = (entries: ResizeObserverEntry[]) => {
    const scroller = this.scrollRef.current;
    if (!scroller) return;
    const top = scroller.getBoundingClientRect().top;
    let shift = 0;
    for (const entry of entries) {
      const height =
        entry.borderBoxSize?.[0]?.blockSize ??
        entry.target.getBoundingClientRect().height;
      const previous = this.heights.get(entry.target);
      this.heights.set(entry.target, height);
      if (previous === undefined || previous === height) continue;
      // Only rows entirely above the viewport: their change would otherwise
      // push the visible content down or up.
      if (entry.target.getBoundingClientRect().bottom <= top + 1)
        shift += height - previous;
    }
    if (shift) scroller.scrollTop += shift;
  };
}
