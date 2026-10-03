import { useImperativeHandle, useMemo, useState, type Ref } from "react";
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
      className="absolute inset-x-0 bottom-full z-30 mb-2 animate-in overflow-hidden rounded-2xl border bg-popover p-1 text-popover-foreground shadow-md duration-150 fade-in-0 slide-in-from-bottom-1"
    >
      {results.length ? (
        results.map((course, i) => (
          <button
            key={course.code}
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            className={cn(
              "flex w-full items-baseline gap-3 rounded-xl px-3 py-2 text-left text-sm",
              i === activeIndex ? "bg-accent" : "hover:bg-accent/60",
            )}

            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive({ query, index: i })}
            onClick={() => onPick(course.code)}
          >
            <span className="shrink-0 font-medium">{course.code}</span>
            <span className="truncate text-muted-foreground">
              {course.name}
            </span>
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
