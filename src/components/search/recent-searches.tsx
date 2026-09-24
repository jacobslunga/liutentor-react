import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentSearches } from "@/stores/recent-searches";

export function RecentSearches() {
  const latest = useRecentSearches((s) => s.latest);
  if (latest.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {latest.map((s) => (
        <Button key={s.courseCode} asChild variant="ghost">
          <Link to="/search/$courseCode" params={{ courseCode: s.courseCode }}>
            {s.courseCode}
            <ArrowUpRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      ))}
    </div>
  );
}
