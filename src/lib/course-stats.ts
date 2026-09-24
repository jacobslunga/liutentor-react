import type { Exam } from "@/types/exam";

const GRADE_ORDER = ["VG", "5", "4", "3", "G", "U"] as const;

export type GradeToken = "grade-fail" | "grade-high" | "grade-low" | "grade-mid";

const GRADE_TOKENS: Record<string, GradeToken> = {
  U: "grade-fail",
  "3": "grade-low",
  G: "grade-mid",
  "4": "grade-mid",
  VG: "grade-high",
  "5": "grade-high",
};

export interface PassRatePoint {
  timestamp: number;
  rate: number | undefined;
  date: string;
  names: string[];
  students: number;
}

export interface GradeEntry {
  key: string;
  value: number;
  pct: number;
  token: GradeToken;
}

export interface CourseStats {
  series: PassRatePoint[];
  measuredPoints: PassRatePoint[];
  grades: GradeEntry[];
  totalStudents: number;
  overallPassRate: number | undefined;
  hasPassRateData: boolean;
  hasGradeData: boolean;
  hasAnyData: boolean;
}

function studentCount(exam: Exam) {
  return Object.values(exam.statistics ?? {}).reduce(
    (sum, n) => sum + Number(n || 0),
    0,
  );
}

export function computeCourseStats(exams: Exam[]): CourseStats {
  const sorted = [...exams].sort((a, b) => {
    const diff = new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime();
    return diff !== 0 ? diff : a.exam_name.localeCompare(b.exam_name);
  });

  const byDate = new Map<string, Exam[]>();
  for (const exam of sorted) {
    const date = exam.exam_date.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), exam]);
  }

  const series: PassRatePoint[] = [...byDate].map(([date, group]) => {
    // Upstream uses a zero pass rate to represent "not recorded".
    const measured = group.filter((e) => Number(e.pass_rate ?? 0) > 0);
    const students = group.reduce((sum, e) => sum + studentCount(e), 0);
    const weight = measured.reduce((sum, e) => sum + studentCount(e), 0);

    const rate = measured.length
      ? weight > 0
        ? measured.reduce((sum, e) => sum + Number(e.pass_rate) * studentCount(e), 0) /
          weight
        : measured.reduce((sum, e) => sum + Number(e.pass_rate), 0) / measured.length
      : undefined;

    return {
      timestamp: new Date(date).getTime(),
      rate,
      date,
      names: group.map((e) => e.exam_name),
      students,
    };
  });

  const totals = new Map<string, number>();
  for (const exam of sorted) {
    for (const [key, count] of Object.entries(exam.statistics ?? {})) {
      if (!(key in GRADE_TOKENS)) continue;
      totals.set(key, (totals.get(key) ?? 0) + Number(count || 0));
    }
  }
  const gradeTotal = [...totals.values()].reduce((sum, n) => sum + n, 0);

  const grades: GradeEntry[] = GRADE_ORDER.filter((key) => (totals.get(key) ?? 0) > 0).map(
    (key) => ({
      key,
      value: totals.get(key) ?? 0,
      pct: gradeTotal ? ((totals.get(key) ?? 0) / gradeTotal) * 100 : 0,
      token: GRADE_TOKENS[key],
    }),
  );

  const totalStudents = grades.reduce((sum, g) => sum + g.value, 0);
  const measuredPoints = series.filter((p) => p.rate !== undefined);
  const hasPassRateData = measuredPoints.length > 0;
  const hasGradeData = totalStudents > 0;

  let overallPassRate: number | undefined;
  if (hasGradeData) {
    const failed = grades.find((g) => g.key === "U")?.value ?? 0;
    overallPassRate = ((totalStudents - failed) / totalStudents) * 100;
  } else if (hasPassRateData) {
    overallPassRate =
      measuredPoints.reduce((sum, p) => sum + (p.rate ?? 0), 0) / measuredPoints.length;
  }

  return {
    series,
    measuredPoints,
    grades,
    totalStudents,
    overallPassRate,
    hasPassRateData,
    hasGradeData,
    hasAnyData: hasPassRateData || hasGradeData,
  };
}

/** Text color for a pass rate: good, middling, poor. */
export function passRateClass(rate: number) {
  if (rate >= 50) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}
