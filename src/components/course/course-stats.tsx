import { useMemo } from "react";
import { computeCourseStats } from "@/lib/course-stats";
import type { Exam } from "@/types/exam";
import { CourseStatsEmpty } from "./course-stats-empty";
import { CourseStatsGrades } from "./course-stats-grades";
import { CourseStatsPassRate } from "./course-stats-pass-rate";

/** Lazy-loaded (default export) so recharts stays out of the course page chunk. */
export default function CourseStats({ exams }: { exams: Exam[] }) {
  const stats = useMemo(() => computeCourseStats(exams), [exams]);

  if (!stats.hasAnyData) {
    return (
      <CourseStatsEmpty
        title="Ingen statistik för den här kursen"
        body="Vi har inga betygsfördelningar eller godkändprocent för kursens tentor. Statistiken hämtas från Y-Sektionen och saknas för en del kurser."
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-12">
      <section className="flex flex-col gap-5">
        <header>
          <h2 className="text-xs font-semibold text-muted-foreground">Godkända över tid</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Andel godkända per tentatillfälle</p>
        </header>
        {stats.hasPassRateData ? (
          <CourseStatsPassRate points={stats.series} average={stats.overallPassRate ?? 0} />
        ) : (
          <CourseStatsEmpty
            title="Ingen godkändprocent registrerad"
            body="Vi saknar godkändprocent för kursens tentor."
          />
        )}
      </section>

      <section className="flex flex-col gap-5">
        <header>
          <h2 className="text-xs font-semibold text-muted-foreground">Betygsfördelning</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Alla registrerade betyg på kursens tentor
          </p>
        </header>
        {stats.hasGradeData ? (
          <CourseStatsGrades grades={stats.grades} total={stats.totalStudents} />
        ) : (
          <CourseStatsEmpty
            title="Ingen betygsfördelning registrerad"
            body="Vi saknar betygsfördelning för kursens tentor."
          />
        )}
      </section>
    </div>
  );
}
