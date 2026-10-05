import { useImperativeHandle, useMemo, useState, type Ref } from "react";
import { CornerDownLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCourseCodes } from "@/queries/exams";

const MAX_RESULTS = 6;

export interface CourseMentionMenuApi {
  handleKey: (key: string) => boolean;
}

interface CourseMentionMenuProps {
  ref?: Ref<CourseMentionMenuApi>;

  query: string;
  onPick: (code: string) => void;
  onClose: () => void;
}

export function CourseMentionMenu({
  ref,
  query,
  onPick,
  onClose,
}: CourseMentionMenuProps) {
  const { courses } = useCourseCodes();
  const [active, setActive] = useState({ query, index: 0 });

  const activeIndex = active.query === query ? active.index : 0;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const byCode = courses.filter((c) => c.code.toLowerCase().startsWith(q));
    const byName =
      q.length >= 2
        ? courses.filter(
            (c) =>
              !c.code.toLowerCase().startsWith(q) &&
              c.name.toLowerCase().includes(q),
          )
        : [];
    return [...byCode, ...byName].slice(0, MAX_RESULTS);
  }, [courses, query]);

  useImperativeHandle(ref, () => ({
    handleKey: (key) => {
      if (key === "Escape") {
        onClose();
        return true;
      }
      if (!results.length) return false;
      if (key === "ArrowDown" || key === "ArrowUp") {
        const step = key === "ArrowDown" ? 1 : -1;
        setActive({
          query,
          index: (activeIndex + step + results.length) % results.length,
        });
        return true;
      }
      if (key === "Enter" || key === "Tab") {
        onPick(results[activeIndex].code);
        return true;
      }
      return false;
    },
  }));

  return (
    <div
      role="listbox"
      aria-label="Kurser"
      className="absolute inset-x-0 bottom-full z-30 mb-2 animate-in overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg duration-150 fade-in-0 slide-in-from-bottom-1"
    >
      {results.length ? (
        results.map((course, i) => (
          <button
            key={course.code}
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            className={cn(
              "relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-md py-1.5 pr-2 pl-3 text-left text-sm transition-colors duration-150 ease-out-quick hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground",
              "before:absolute before:top-1/2 before:left-1 before:h-4 before:w-1 before:-translate-y-1/2 before:scale-y-0 before:rounded-full before:bg-brand before:opacity-0 before:transition-[scale,opacity] before:duration-150 before:ease-snap aria-selected:before:scale-y-100 aria-selected:before:opacity-100 motion-reduce:before:transition-none",
            )}

            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive({ query, index: i })}
            onClick={() => onPick(course.code)}
          >
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="min-w-16 shrink-0 font-medium tabular-nums">
                {course.code}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {course.name}
              </span>
            </span>
            <CornerDownLeftIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          {query.trim()
            ? `Ingen kurs matchar "${query.trim()}". Du kan ändå skriva hela koden.`
            : "Skriv en kurskod eller ett kursnamn, t.ex. TATA41."}
        </p>
      )}
    </div>
  );
}
