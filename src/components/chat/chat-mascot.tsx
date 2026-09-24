import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_X = 8;
const MAX_Y = 6;

/**
 * The chat's empty-state face; its eyes follow the pointer and blink now and
 * then. Animated with direct attribute writes, never through React state.
 */
export function ChatMascot({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const eyes = eyesRef.current;
    if (!svg || !eyes) return;

    let x = 0;
    let y = 0;
    let pointerX = 0;
    let pointerY = 0;
    let hasPointer = false;
    let frame = 0;
    let blinkTimer = 0;

    const step = () => {
      const rect = svg.getBoundingClientRect();
      const dx = pointerX - (rect.left + rect.width / 2);
      const dy = pointerY - (rect.top + rect.height / 2);
      const denom = Math.hypot(dx, dy) + 120;
      const tx = hasPointer ? (dx / denom) * MAX_X : 0;
      const ty = hasPointer ? (dy / denom) * MAX_Y : 0;

      if (Math.abs(tx - x) < 0.001 && Math.abs(ty - y) < 0.001) {
        x = tx;
        y = ty;
        frame = 0;
      } else {
        x += (tx - x) * 0.18;
        y += (ty - y) * 0.18;
        frame = requestAnimationFrame(step);
      }
      eyes.setAttribute("transform", `translate(${x.toFixed(3)} ${y.toFixed(3)})`);
    };

    const onMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      hasPointer = true;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(
        () => {
          svg.classList.add("is-blinking");
          blinkTimer = window.setTimeout(() => {
            svg.classList.remove("is-blinking");
            scheduleBlink();
          }, 130);
        },
        4000 + Math.random() * 3000,
      );
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    scheduleBlink();
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      clearTimeout(blinkTimer);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={cn("group/mascot text-primary", className)}
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
    >
      <circle cx="50" cy="50" r="46" fill="currentColor" />
      <g ref={eyesRef}>
        {[29.5, 60.5].map((x) => (
          <rect
            key={x}
            x={x}
            y="39"
            width="10"
            height="16"
            rx="1.5"
            className="origin-center transition-transform duration-150 [transform-box:fill-box] group-[.is-blinking]/mascot:scale-y-[0.12] motion-reduce:transition-none"
            style={{ fill: "color-mix(in oklch, var(--primary) 45%, #000)" }}
          />
        ))}
      </g>
    </svg>
  );
}
