import { ActionList } from "@primer/react";
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
    <ActionList id={id} role="listbox" aria-label="Kurser">
      {items.map((item) => (
        <ActionList.Item
          key={item.code}
          id={resultOptionId(id, item.code)}
          role="option"
          active={item.code === active}
          aria-selected={item.code === active}
          onSelect={() => onSelect(item.code)}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 font-medium">{item.code}</span>
            <span className="truncate text-xs text-muted-foreground">
              {item.name}
            </span>
          </span>
          <ActionList.TrailingVisual>
            <CornerDownLeftIcon />
          </ActionList.TrailingVisual>
        </ActionList.Item>
      ))}
    </ActionList>
  );
}
