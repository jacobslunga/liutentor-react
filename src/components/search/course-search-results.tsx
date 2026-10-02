import { CornerDownLeftIcon } from "lucide-react";
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
    // Focus stays in the search field (aria-activedescendant), so this is a
    // plain listbox rather than a focus-managing menu.
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
          className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
          onClick={() => onSelect(item.code)}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            {/* Codes are six characters but not equally wide; a fixed column
                keeps the names lined up. */}
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
