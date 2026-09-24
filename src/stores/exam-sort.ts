import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ExamSortBy = "date" | "pass-rate";
export type ExamSortDirection = "asc" | "desc";
export type ExamSortScope = "course-page" | "exam-picker";

interface ExamSortPreference {
  sortBy: ExamSortBy;
  sortDirection: ExamSortDirection;
}

const DEFAULT_PREFERENCE: ExamSortPreference = { sortBy: "date", sortDirection: "desc" };

interface ExamSortState {
  preferences: Record<ExamSortScope, ExamSortPreference>;
  setSortBy: (scope: ExamSortScope, sortBy: ExamSortBy) => void;
  setSortDirection: (scope: ExamSortScope, sortDirection: ExamSortDirection) => void;
}

const useExamSortStore = create<ExamSortState>()(
  persist(
    (set) => ({
      preferences: {
        "course-page": DEFAULT_PREFERENCE,
        "exam-picker": DEFAULT_PREFERENCE,
      },
      setSortBy: (scope, sortBy) =>
        set((s) => ({
          preferences: { ...s.preferences, [scope]: { ...s.preferences[scope], sortBy } },
        })),
      setSortDirection: (scope, sortDirection) =>
        set((s) => ({
          preferences: {
            ...s.preferences,
            [scope]: { ...s.preferences[scope], sortDirection },
          },
        })),
    }),
    { name: "liutentor-exam-sort", version: 1 },
  ),
);

export function useExamSortPreference(scope: ExamSortScope) {
  const preference = useExamSortStore((s) => s.preferences[scope]);
  const setSortBy = useExamSortStore((s) => s.setSortBy);
  const setSortDirection = useExamSortStore((s) => s.setSortDirection);

  return {
    sortBy: preference.sortBy,
    sortDirection: preference.sortDirection,
    setSortBy: (value: ExamSortBy) => setSortBy(scope, value),
    setSortDirection: (value: ExamSortDirection) => setSortDirection(scope, value),
  };
}

/** Sorts exams by date or pass rate; exams without a pass rate sink to the end. */
export function sortExams<T extends { exam_date: string; exam_name: string; pass_rate: number }>(
  exams: T[],
  sortBy: ExamSortBy,
  sortDirection: ExamSortDirection,
): T[] {
  return [...exams].sort((a, b) => {
    if (sortBy === "pass-rate") {
      const aHas = Number.isFinite(Number(a.pass_rate)) && Number(a.pass_rate) > 0;
      const bHas = Number.isFinite(Number(b.pass_rate)) && Number(b.pass_rate) > 0;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (aHas && bHas) {
        const diff = Number(a.pass_rate) - Number(b.pass_rate);
        if (diff !== 0) return sortDirection === "asc" ? diff : -diff;
      }
    } else {
      const diff = a.exam_date.localeCompare(b.exam_date);
      if (diff !== 0) return sortDirection === "asc" ? diff : -diff;
    }

    const dateDiff = b.exam_date.localeCompare(a.exam_date);
    if (dateDiff !== 0) return dateDiff;
    return (a.exam_name ?? "").localeCompare(b.exam_name ?? "");
  });
}
