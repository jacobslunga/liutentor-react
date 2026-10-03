import type { RefObject } from "react";


const NEAR_MARGIN = "2000px 0px";













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


      if (entry.target.getBoundingClientRect().bottom <= top + 1)
        shift += height - previous;
    }
    if (shift) scroller.scrollTop += shift;
  };
}
