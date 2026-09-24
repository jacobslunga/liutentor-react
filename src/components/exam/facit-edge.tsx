import { ChevronLeftIcon } from "lucide-react";
import { useEffect, useRef } from "react";

/** How close to the right edge (as a share of the width) the glow starts. */
const PROXIMITY_START = 0.7;

function proximity(e: MouseEvent) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const safeZone = h * 0.25;
  if (e.clientY < safeZone || e.clientY > h - safeZone) return 0;
  const start = w * PROXIMITY_START;
  if (e.clientX <= start) return 0;
  return Math.min(Math.max((e.clientX - start) / (w - start), 0), 1);
}

/**
 * The "Facit" tab glowing on the right edge in exam-only mode; it grows as the
 * pointer approaches. Tracks the pointer and springs its styles itself, so the
 * page never re-renders while the mouse moves.
 */
export function FacitEdge({ label = "Facit" }: { label?: string }) {
  const glowRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let value = 0;
    let target = 0;
    let frame = 0;

    const paint = () => {
      const v = value;
      // Dark backgrounds need a softer glow.
      const s = document.documentElement.classList.contains("dark") ? 0.6 : 1;
      const mix = (percent: number) =>
        `color-mix(in oklab, var(--primary) ${(percent * s).toFixed(1)}%, transparent)`;

      const glow = glowRef.current;
      if (glow) {
        glow.style.width = `${150 + v * 90}px`;
        glow.style.opacity = String(0.48 + v * 0.52);
        glow.style.transform = `translateY(-50%) scaleY(${(0.82 + v * 0.18).toFixed(3)})`;
        glow.style.backgroundImage = `radial-gradient(ellipse at 100% 50%, ${mix(20 + v * 32)} 0%, ${mix(12 + v * 22)} 22%, ${mix(4 + v * 12)} 48%, transparent 74%)`;
      }
      const tab = tabRef.current;
      if (tab) {
        tab.style.opacity = String(0.68 + v * 0.32);
        tab.style.transform = `translate(${(10 - v * 27).toFixed(1)}px, -50%)`;
        tab.style.borderColor = `color-mix(in oklab, var(--primary) ${(28 + v * 42).toFixed(0)}%, var(--border))`;
      }
      if (iconRef.current) iconRef.current.style.transform = `translateX(${(-v * 3).toFixed(1)}px)`;
    };

    const step = () => {
      const diff = target - value;
      if (Math.abs(diff) < 0.001) {
        value = target;
        frame = 0;
      } else {
        value += diff * 0.18;
        frame = requestAnimationFrame(step);
      }
      paint();
    };

    const animateTo = (next: number) => {
      target = next;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onMove = (e: MouseEvent) => animateTo(proximity(e));
    const onLeave = () => animateTo(0);

    paint();
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-64 overflow-hidden">
      <div
        ref={glowRef}
        className="absolute top-1/2 right-0 h-[min(34rem,62vh)] origin-right will-change-[width,transform,opacity]"
      />
      <div
        ref={tabRef}
        className="absolute top-1/2 right-0 flex h-10 items-center gap-2 pr-4 whitespace-nowrap will-change-[transform,opacity]"
      >
        <ChevronLeftIcon ref={iconRef} className="size-4 shrink-0 text-primary will-change-transform" />
        <span className="text-xs font-semibold text-primary">{label}</span>
      </div>
    </div>
  );
}
