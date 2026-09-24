import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCourseCodes } from "@/queries/exams";
import { CourseSearchResults } from "./course-search-results";
import { useCourseSearch } from "./use-course-search";

/**
 * Wires a text input to a cmdk result list shown in a popover under it. cmdk
 * handles arrow keys on its root, so any input inside works; Enter picks the
 * highlighted course, or searches the typed code when nothing matches.
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
  const open = focused && query.trim().length > 0;

  function select(code: string) {
    goToCourse(code);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && items.length === 0 && query.trim()) {
      e.preventDefault();
      select(query);
    } else if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  }

  return (
    <CommandPrimitive shouldFilter={false} loop className={cn("relative w-full", className)}>
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

const EXAMPLE_TYPE_MS = 55;
const EXAMPLE_DELETE_MS = 30;
const EXAMPLE_HOLD_MS = 1200;
const EXAMPLE_GAP_MS = 500;

/**
 * Types example course codes into the placeholder. Writes the attribute
 * directly so the animation never re-renders the search; the placeholder is
 * hidden while there is a query, so it simply keeps running underneath.
 */
function useTypingPlaceholder(inputRef: React.RefObject<HTMLInputElement | null>) {
  const { codes } = useCourseCodes();

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !codes.length) return;

    const examples = [...codes].sort(() => Math.random() - 0.5);
    let index = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = examples[index % examples.length];
      const doneTyping = chars === current.length && !deleting;
      const doneDeleting = chars === 0 && deleting;
      const delay = doneTyping
        ? EXAMPLE_HOLD_MS
        : doneDeleting
          ? EXAMPLE_GAP_MS
          : deleting
            ? EXAMPLE_DELETE_MS
            : EXAMPLE_TYPE_MS;

      timer = setTimeout(() => {
        if (doneTyping) deleting = true;
        else if (doneDeleting) {
          deleting = false;
          index += 1;
        } else {
          chars += deleting ? -1 : 1;
          input.placeholder = `Sök efter ${current.slice(0, chars)}`;
        }
        tick();
      }, delay);
    };

    tick();
    return () => clearTimeout(timer);
  }, [codes, inputRef]);
}

/** Large pill search on the home page. */
export function HeroCourseSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  useTypingPlaceholder(inputRef);

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
