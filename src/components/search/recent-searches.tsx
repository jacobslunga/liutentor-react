import { ArrowUpRightIcon } from "lucide-react";
import { RouterLinkButton } from "@/components/shared/router-link";
import { useRecentSearches } from "@/stores/recent-searches";

export function RecentSearches() {
  const latest = useRecentSearches((s) => s.latest);
  if (latest.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {latest.map((s) => (
        <RouterLinkButton key={s.courseCode} to="/search/$courseCode" params={{ courseCode: s.courseCode }} variant="ghost">
          {s.courseCode}
        <ArrowUpRightIcon /></RouterLinkButton>
      ))}
    </div>
  );
}
