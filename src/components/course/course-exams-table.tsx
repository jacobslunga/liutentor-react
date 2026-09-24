import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { CheckIcon, MinusIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getExamPrefix } from "@/lib/exams";
import { cn } from "@/lib/utils";
import { examDetailQuery } from "@/queries/exams";
import { sortExams, type ExamSortBy, type ExamSortDirection } from "@/stores/exam-sort";
import type { Exam } from "@/types/exam";
import { ExamStatsDialog } from "./exam-stats-dialog";

const GRID_COLS =
  "grid grid-cols-[minmax(max-content,1fr)_max-content_max-content_max-content] items-center gap-x-4 px-4 sm:grid-cols-[minmax(0,3fr)_minmax(80px,1fr)_minmax(64px,1fr)_minmax(88px,1fr)]";

interface CourseExamsTableProps {
  courseCode: string;
  exams: Exam[];
  sortBy: ExamSortBy;
  sortDirection: ExamSortDirection;
}

export function CourseExamsTable({ courseCode, exams, sortBy, sortDirection }: CourseExamsTableProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const prefixes = useMemo(
    () => [...new Set(exams.map(getExamPrefix).filter(Boolean))],
    [exams],
  );

  const visibleExams = useMemo(() => {
    const sorted = sortExams(exams, sortBy, sortDirection);
    return activeFilters.size
      ? sorted.filter((e) => activeFilters.has(getExamPrefix(e)))
      : sorted;
  }, [exams, sortBy, sortDirection, activeFilters]);

  function toggleFilter(prefix: string) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {prefixes.length > 1 && (
        <div className="flex w-full flex-wrap gap-2">
          {prefixes.map((prefix) => (
            <Button
              key={prefix}
              size="sm"
              variant={activeFilters.has(prefix) ? "default" : "outline"}
              onClick={() => toggleFilter(prefix)}
            >
              {prefix}
            </Button>
          ))}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-lg border">
        <div className="w-max min-w-full overflow-hidden rounded-lg sm:w-full">
          <div className={cn(GRID_COLS, "border-b bg-muted/30 py-3")}>
            <div className="text-xs text-muted-foreground">Tentamen</div>
            <div className="text-xs text-muted-foreground">Typ</div>
            <div className="text-center text-xs text-muted-foreground">Facit</div>
            <div className="text-right text-xs text-muted-foreground">Godkänd</div>
          </div>

          {visibleExams.map((exam) => (
            <ExamRow key={exam.id} courseCode={courseCode} exam={exam} />
          ))}
        </div>
      </div>
    </div>
  );
}

const ExamRow = memo(function ExamRow({ courseCode, exam }: { courseCode: string; exam: Exam }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const prefix = getExamPrefix(exam);
  const target = {
    to: "/search/$courseCode/$examId",
    params: { courseCode, examId: String(exam.id) },
  } as const;

  // Warm the route chunk and the exam detail before the click lands.
  function prefetch() {
    void router.preloadRoute(target);
    void queryClient.prefetchQuery(examDetailQuery(exam.id));
  }

  return (
    <div
      role="link"
      tabIndex={0}
      className={cn(
        GRID_COLS,
        "group min-h-16 cursor-pointer border-b py-3 transition-colors last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
      )}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onClick={() => void navigate(target)}
      onKeyDown={(e) => {
        if (e.key === "Enter") void navigate(target);
      }}
    >
      <div className="sm:min-w-0">
        <div className="text-sm font-semibold whitespace-nowrap transition-colors group-hover:text-foreground/80 sm:truncate">
          {exam.exam_name}
        </div>
        <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground/70">
          {exam.exam_date}
        </div>
      </div>

      <div>
        {prefix && (
          <span className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-2xs text-muted-foreground">
            {prefix}
          </span>
        )}
      </div>

      <div className="flex justify-center">
        {exam.has_solution ? (
          <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <MinusIcon className="size-4 text-muted-foreground/30" />
        )}
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <ExamStatsDialog
          statistics={exam.statistics}
          date={exam.exam_date}
          passRate={exam.pass_rate}
        />
      </div>
    </div>
  );
});
