import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder";
import { CourseSearchResults } from "./course-search-results";
import { useCourseSearch } from "./use-course-search";

/**
 * Wires a text input to a cmdk result list shown in a popover under it. The
 * list renders in a portal, outside the cmdk root, so cmdk's own DOM-based
 * keyboard handling can't reach it: we drive the highlight ourselves and feed
 * it back as the controlled value. Enter takes the highlighted course, which
 * starts on the first result, so a typed course code needs no selection.
 */
function CourseSearchBase({
  className,
  renderInput,
}: {
  className?: string;
  renderInput: (props: {
    value: string;
    onChange: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  }) => ReactNode;
}) {
  const { query, setQuery, items, goToCourse } = useCourseSearch();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState("");
  const open = focused && query.trim().length > 0;

  // A new result list starts highlighted on its first item.
  useEffect(() => {
    setActive(items[0]?.code ?? "");
  }, [items]);

  function select(code: string) {
    goToCourse(code);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function move(delta: number) {
    if (items.length === 0) return;
    const current = items.findIndex((item) => item.code === active);
    const next = (current + delta + items.length) % items.length;
    setActive(items[next].code);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const code = active || query.trim();
      if (!code) return;
      e.preventDefault();
      select(code);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  }

  return (
    <CommandPrimitive
      shouldFilter={false}
      loop
      value={active}
      onValueChange={setActive}
      className={cn("relative w-full", className)}
    >
      <Popover open={open}>
        <PopoverAnchor asChild>
          <div>
            {renderInput({
              value: query,
              onChange: setQuery,
              onFocus: () => setFocused(true),
              onBlur: () => setFocused(false),
              onKeyDown,
            })}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          // Keep focus in the input so clicking a result doesn't close the list first.
          onMouseDown={(e) => e.preventDefault()}
        >
          <CourseSearchResults query={query} items={items} onSelect={select} />
        </PopoverContent>
      </Popover>
    </CommandPrimitive>
  );
}

/** Large pill search on the home page. */
export function HeroCourseSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  useTypingPlaceholder(inputRef, "Sök efter ");

  useEffect(() => inputRef.current?.focus(), []);

  return (
    <CourseSearchBase
      renderInput={({ value, onChange, ...handlers }) => (
        <div className="relative flex w-full items-center rounded-full border border-foreground/20 bg-background text-sm transition-colors duration-200 hover:border-foreground/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:hover:border-primary">
          <SearchIcon className="pointer-events-none absolute left-5 size-6 text-muted-foreground" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Sök efter"
            aria-label="Sök kurskod"
            autoComplete="off"
            spellCheck={false}
            className="w-full min-w-0 border-none bg-transparent py-4 ps-14 pe-12 text-base text-foreground/80 uppercase outline-none placeholder:normal-case"
            {...handlers}
          />
        </div>
      )}
    />
  );
}

/** Compact search in the search header. Focus it with "/". */
export function HeaderCourseSearch({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CourseSearchBase
      className={className}
      renderInput={({ value, onChange, ...handlers }) => (
        <InputGroup className="h-9">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Sök kurskod..."
            aria-label="Sök kurskod"
            autoComplete="off"
            spellCheck={false}
            className="uppercase placeholder:normal-case"
            {...handlers}
          />
          <InputGroupAddon align="inline-end" className="hidden sm:flex">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
      )}
    />
  );
}
