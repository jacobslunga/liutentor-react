import { useIsFetching } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePageLoadingStore } from "@/stores/page-loading";

const DURATION = 2000;

const THROTTLE = 80;





const SETTLE_DELAY = 250;
const HIDE_DELAY = 150;





const ARM_WINDOW = 600;
const FADE_MS = 300;


function isBarless(pathname: string) {
  return pathname === "/chatt" || pathname.startsWith("/chatt/");
}


function estimate(elapsed: number) {
  const completion = (elapsed / DURATION) * 100;
  return (2 / Math.PI) * 100 * Math.atan(completion / 50);
}






export function AppLoadingBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const routerPending = useRouterState({ select: (s) => s.status === "pending" });
  const fetching = useIsFetching() > 0;
  const pendingTasks = usePageLoadingStore((s) => s.pending > 0);
  const failed = usePageLoadingStore((s) => s.failed);
  const barless = isBarless(pathname);
  const isLoading = !barless && (routerPending || fetching || pendingTasks);
  const [armed, setArmed] = useState(false);


  useEffect(() => {
    setArmed(true);
    const id = setTimeout(() => setArmed(false), ARM_WINDOW);
    return () => clearTimeout(id);
  }, [pathname]);

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

        t.reset = setTimeout(() => setProgress(0), FADE_MS);
      }, HIDE_DELAY);
    };

    if (barless) {


      clearAll();
      stopAnimation();
      setVisible(false);
      setProgress(0);
      return;
    }

    if (isLoading) {

      if (t.settle) {
        clearTimeout(t.settle);
        t.settle = undefined;
        return;
      }
      if (t.raf || t.throttle) return;

      if (!armed) return;
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
  }, [isLoading, armed, barless]);

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
      style={{ background: failed ? "var(--destructive)" : "var(--brand)" }}
    />
  );
}
