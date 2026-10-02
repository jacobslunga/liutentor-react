import { SearchIcon } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder";
import { CourseSearchResults } from "./course-search-results";
import { resultOptionId, useCourseSearch } from "./use-course-search";
import { KeyHint } from "@/components/shared/key-hint";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * Wires a text input to a listbox shown under it, as a
 * combobox. Focus never leaves the input: we drive the highlight ourselves
 * and point aria-activedescendant at it. Enter takes the highlighted course,
 * which starts on the first result, so a typed course code needs no selection.
 */
function CourseSearchBase({
  className,
  renderInput,
}: {
  className?: string;
  renderInput: (props: {
    role: "combobox";
    "aria-expanded": boolean;
    "aria-controls": string;
    "aria-autocomplete": "list";
    "aria-activedescendant": string | undefined;
    value: string;
    onChange: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  }) => ReactNode;
}) {
  const listId = useId();
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
    <div className={cn("relative w-full", className)}>
      {renderInput({
        role: "combobox",
        "aria-expanded": open,
        "aria-controls": listId,
        "aria-autocomplete": "list",
        "aria-activedescendant":
          open && active ? resultOptionId(listId, active) : undefined,
        value: query,
        onChange: setQuery,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onKeyDown,
      })}
      {open && (
        <div
          className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg"
          // Keep focus in the input so clicking a result doesn't close the list first.
          onMouseDown={(e) => e.preventDefault()}
        >
          <CourseSearchResults
            id={listId}
            query={query}
            items={items}
            active={active}
            onSelect={select}
          />
        </div>
      )}
    </div>
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
        <div className="relative flex w-full items-center rounded-full border-2 border-foreground/15 bg-background text-sm transition-colors duration-200 hover:border-foreground/40 focus-within:border-brand focus-within:hover:border-brand">
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
        <InputGroup>
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
            <KeyHint keys="/" />
          </InputGroupAddon>
        </InputGroup>
      )}
    />
  );
}
