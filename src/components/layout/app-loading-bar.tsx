import { useIsFetching } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { usePageLoadingStore } from "@/stores/page-loading";

const DURATION = 2000;
/** Ignore bursts of work shorter than this, so fast pages never flash. */
const THROTTLE = 80;
/**
 * How long to wait for more work before declaring the page done. Loading is
 * chained (data resolves, then a lazy component mounts and starts fetching), so
 * the count dips to zero in between.
 */
const SETTLE_DELAY = 250;
const HIDE_DELAY = 150;
const FADE_MS = 300;

/** Asymptotic: creeps toward 100% without arriving until the work finishes. */
function estimate(elapsed: number) {
  const completion = (elapsed / DURATION) * 100;
  return (2 / Math.PI) * 100 * Math.atan(completion / 50);
}

/**
 * Top-of-page progress bar. Progress is written straight to the element's
 * style every frame, so this component only re-renders when loading starts or
 * stops.
 */
export function AppLoadingBar() {
  const routerPending = useRouterState({ select: (s) => s.status === "pending" });
  const fetching = useIsFetching() > 0;
  const pendingTasks = usePageLoadingStore((s) => s.pending > 0);
  const failed = usePageLoadingStore((s) => s.failed);
  const isLoading = routerPending || fetching || pendingTasks;

  const barRef = useRef<HTMLDivElement>(null);
  const timers = useRef({
    raf: 0,
    start: 0,
    visible: false,
    throttle: undefined as ReturnType<typeof setTimeout> | undefined,
    settle: undefined as ReturnType<typeof setTimeout> | undefined,
    hide: undefined as ReturnType<typeof setTimeout> | undefined,
    reset: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  useEffect(() => {
    const t = timers.current;
    const bar = barRef.current;
    if (!bar) return;

    const setProgress = (p: number) => {
      bar.style.width = `${p}%`;
    };
    const setVisible = (v: boolean) => {
      t.visible = v;
      bar.style.opacity = v ? "1" : "0";
    };
    const clearAll = () => {
      clearTimeout(t.throttle);
      clearTimeout(t.settle);
      clearTimeout(t.hide);
      clearTimeout(t.reset);
      t.throttle = t.settle = t.hide = t.reset = undefined;
    };
    const stopAnimation = () => {
      if (t.raf) cancelAnimationFrame(t.raf);
      t.raf = 0;
    };
    const step = (now: number) => {
      if (!t.start) t.start = now;
      setProgress(Math.max(0, Math.min(100, estimate(now - t.start))));
      t.raf = requestAnimationFrame(step);
    };
    const finish = () => {
      clearAll();
      stopAnimation();
      if (!t.visible) {
        setProgress(0);
        return;
      }
      setProgress(100);
      t.hide = setTimeout(() => {
        setVisible(false);
        // Keep the width until the fade ends so the bar doesn't shrink visibly.
        t.reset = setTimeout(() => setProgress(0), FADE_MS);
      }, HIDE_DELAY);
    };

    if (isLoading) {
      // Work arriving during the settle window rejoins the running batch.
      if (t.settle) {
        clearTimeout(t.settle);
        t.settle = undefined;
        return;
      }
      if (t.raf || t.throttle) return;
      clearAll();
      t.start = 0;
      setProgress(0);
      t.throttle = setTimeout(() => {
        t.throttle = undefined;
        setVisible(true);
        t.raf = requestAnimationFrame(step);
      }, THROTTLE);
    } else if (t.raf || t.throttle) {
      clearTimeout(t.settle);
      t.settle = setTimeout(finish, SETTLE_DELAY);
    }
  }, [isLoading]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.throttle);
      clearTimeout(t.settle);
      clearTimeout(t.hide);
      clearTimeout(t.reset);
      if (t.raf) cancelAnimationFrame(t.raf);
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[999999] h-0.5 w-0 opacity-0 transition-[width,opacity] duration-100 ease-linear motion-reduce:transition-opacity"
      style={{ background: failed ? "var(--destructive)" : "var(--primary)" }}
    />
  );
}
