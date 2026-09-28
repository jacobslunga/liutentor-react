import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const MODES = [
  { mode: "tentor", label: "Tentor", to: "/" },
  { mode: "chatt", label: "Chatt", to: "/chatt" },
] as const;

export type AppMode = (typeof MODES)[number]["mode"];

/**
 * The app's two halves, as a large segmented switch: practising on old exams,
 * or learning in the chat.
 */
export function AppModeTabs({
  active,
  className,
}: {
  active: AppMode;
  className?: string;
}) {
  return (
    <nav
      aria-label="Välj del av appen"
      className={cn("inline-flex rounded-full bg-muted p-1", className)}
    >
      {MODES.map(({ mode, label, to }) => (
        <Link
          key={mode}
          to={to}
          aria-current={mode === active ? "page" : undefined}
          className={cn(
            "min-w-28 rounded-full px-6 py-2 text-center text-[0.9375rem] transition-all duration-200 sm:min-w-32",
            mode === active
              ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/5"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
