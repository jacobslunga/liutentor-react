import { CornerDownLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resultOptionId, type CourseItem } from "./use-course-search";

interface CourseSearchResultsProps {
  id: string;
  query: string;
  items: CourseItem[];
  active: string;
  onSelect: (code: string) => void;
}

export function CourseSearchResults({
  id,
  query,
  items,
  active,
  onSelect,
}: CourseSearchResultsProps) {
  const q = query.trim().toUpperCase();

  if (items.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        {q ? `Ingen kurs matchar "${q}"` : "Skriv en kurskod"}
      </p>
    );
  }

  return (


    <ul
      id={id}
      role="listbox"
      aria-label="Kurser"
      className="flex flex-col p-1"
    >
      {items.map((item) => (
        <li
          key={item.code}
          id={resultOptionId(id, item.code)}
          role="option"
          aria-selected={item.code === active}
          className={cn(
            "relative flex cursor-pointer items-center justify-between gap-2 rounded-md py-1.5 pr-2 pl-3 text-sm transition-colors duration-150 ease-out-quick hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground",

            "before:absolute before:top-1/2 before:left-1 before:h-4 before:w-1 before:-translate-y-1/2 before:scale-y-0 before:rounded-full before:bg-brand before:opacity-0 before:transition-[scale,opacity] before:duration-150 before:ease-snap aria-selected:before:scale-y-100 aria-selected:before:opacity-100 motion-reduce:before:transition-none",
          )}
          onClick={() => onSelect(item.code)}
        >
          <span className="flex min-w-0 items-baseline gap-2">


            <span className="min-w-16 shrink-0 font-medium tabular-nums">
              {item.code}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {item.name}
            </span>
          </span>
          <CornerDownLeftIcon className="size-4 shrink-0 text-muted-foreground" />
        </li>
      ))}
    </ul>
  );
}
