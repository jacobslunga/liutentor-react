import {
  BookOpenCheckIcon,
  CalendarIcon,
  FileTextIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { lazy, Suspense, useMemo, type ReactNode } from "react";
import {
  computeCourseStats,
  passRateClass,
  type GradeEntry,
} from "@/lib/course-stats";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types/exam";
import { Skeleton } from "@/components/ui/skeleton";

const CourseStatsPassRate = lazy(() =>
  import("./course-stats-pass-rate").then((m) => ({
    default: m.CourseStatsPassRate,
  })),
);

export function CourseSidebar({
  exams,
  className,
}: {
  exams: Exam[];
  className?: string;
}) {
  const stats = useMemo(() => computeCourseStats(exams), [exams]);
  const withSolutions = exams.filter((e) => e.has_solution).length;
  const years = exams
    .map((e) => e.exam_date.slice(0, 4))
    .filter(Boolean)
    .sort();
  const yearSpan =
    years.length && years[0] !== years.at(-1)
      ? `${years[0]}–${years.at(-1)}`
      : years[0];

  return (
    <aside className={cn("flex flex-col divide-y text-sm", className)}>
      <Section title="Om kursen" first>
        <ul className="space-y-2.5 text-muted-foreground">
          <Fact icon={FileTextIcon}>
            <strong className="text-foreground">{exams.length}</strong> tentor
          </Fact>
          <Fact icon={BookOpenCheckIcon}>
            <strong className="text-foreground">{withSolutions}</strong> med
            facit
          </Fact>
          {yearSpan && <Fact icon={CalendarIcon}>{yearSpan}</Fact>}
          {stats.totalStudents > 0 && (
            <Fact icon={UsersIcon}>
              <strong className="text-foreground">
                {stats.totalStudents.toLocaleString("sv-SE")}
              </strong>{" "}
              betyg registrerade
            </Fact>
          )}
          {stats.overallPassRate !== undefined && (
            <Fact icon={TrendingUpIcon}>
              <strong className={passRateClass(stats.overallPassRate)}>
                {Math.round(stats.overallPassRate)}%
              </strong>{" "}
              godkända i snitt
            </Fact>
          )}
        </ul>
      </Section>

      {stats.hasGradeData && (
        <Section title="Betygsfördelning">
          <GradeBar grades={stats.grades} />
        </Section>
      )}

      {stats.hasPassRateData && (
        <Section title="Godkända över tid">
          <Suspense fallback={<Skeleton className="h-44 w-full" />}>
            <CourseStatsPassRate
              points={stats.series}
              average={stats.overallPassRate ?? 0}
              className="h-44"
            />
          </Suspense>
        </Section>
      )}

      <Section title="Källa">
        <p className="text-muted-foreground">
          Statistiken kommer från{" "}
          <a
            href="https://ysektionen.se/student/tentastatistik/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Y-Sektionen
          </a>
          {stats.hasAnyData ? "." : " och saknas för den här kursen."}
        </p>
      </Section>
    </aside>
  );
}

function Section({
  title,
  first,
  children,
}: {
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={first ? "pb-6" : "py-6"}>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Fact({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="size-4 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function GradeBar({ grades }: { grades: GradeEntry[] }) {
  return (
    <>
      <div className="flex h-2 w-full overflow-hidden rounded-full" aria-hidden>
        {grades.map((grade) => (
          <span
            key={grade.key}
            className="h-full not-last:mr-0.5"
            style={{
              width: `${grade.pct}%`,
              background: `var(--${grade.token})`,
            }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {grades.map((grade) => (
          <li key={grade.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: `var(--${grade.token})` }}
            />
            <span className="font-semibold">{grade.key}</span>
            <span className="text-muted-foreground tabular-nums">
              {grade.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
