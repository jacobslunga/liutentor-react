import { CornerDownLeftIcon } from "lucide-react";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { CourseItem } from "./use-course-search";

interface CourseSearchResultsProps {
  query: string;
  items: CourseItem[];
  onSelect: (code: string) => void;
}

export function CourseSearchResults({ query, items, onSelect }: CourseSearchResultsProps) {
  const q = query.trim().toUpperCase();

  return (
    <CommandList>
      <CommandEmpty>{q ? `Ingen kurs matchar "${q}"` : "Skriv en kurskod"}</CommandEmpty>
      {items.length > 0 && (
        <CommandGroup>
          {items.map((item) => (
            <CommandItem key={item.code} value={item.code} onSelect={onSelect}>
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="shrink-0 font-medium">{item.code}</span>
                <span className="truncate text-xs text-muted-foreground">{item.name}</span>
              </span>
              <CornerDownLeftIcon className="size-3.5 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </CommandList>
  );
}
