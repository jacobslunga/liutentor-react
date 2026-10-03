import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { useLayoutEffect, useRef, useState, type ElementType } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;

  label: string;
  icon?: ElementType;

  iconOnly?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  "aria-label": ariaLabel,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  "aria-label": string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(
    null,
  );

  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const active = track.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!active) return setPill(null);
      setPill({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <ToggleGroupPrimitive.Root
      ref={trackRef}
      type="single"
      aria-label={ariaLabel}
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn(
        "relative isolate inline-flex h-8 items-center rounded-lg bg-muted p-0.5",
        className,
      )}
    >
      {pill && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0.5 left-0 -z-10 rounded-md bg-card shadow-raised inset-shadow-highlight dark:bg-input/60",
            ready &&
              "transition-[translate,width] duration-200 ease-snap motion-reduce:transition-none",
          )}
          style={{ width: pill.width, translate: `${pill.left}px 0` }}
        />
      )}
      {options.map(({ value: optionValue, label, icon: Icon, iconOnly }) => {
        const item = (
          <ToggleGroupPrimitive.Item
            key={optionValue}
            value={optionValue}
            aria-label={iconOnly ? label : undefined}
            className="inline-flex h-full items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out-quick outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-checked:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
          >
            {Icon && <Icon />}
            {!iconOnly && label}
          </ToggleGroupPrimitive.Item>
        );
        return iconOnly ? (
          <Tooltip key={optionValue}>
            <TooltipTrigger asChild>{item}</TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ) : (
          item
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
