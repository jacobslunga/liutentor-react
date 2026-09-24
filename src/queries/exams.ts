import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getCourseExams, getCourses, getExamDetail } from "@/lib/api";

export const coursesQuery = queryOptions({
  queryKey: ["courses"],
  queryFn: ({ signal }) => getCourses(signal),
  staleTime: Infinity,
});

export const courseExamsQuery = (courseCode: string) =>
  queryOptions({
    queryKey: ["exams", courseCode],
    queryFn: ({ signal }) => getCourseExams(courseCode, signal),
  });

export const examDetailQuery = (examId: string | number) =>
  queryOptions({
    queryKey: ["exam", String(examId)],
    queryFn: ({ signal }) => getExamDetail(examId, signal),
    staleTime: Infinity,
  });

/** Course codes that have exams in the archive, plus a code → name lookup. */
export function useCourseCodes() {
  const { data: courses = [], isPending } = useQuery(coursesQuery);

  return useMemo(
    () => ({
      courses,
      codes: courses.map((c) => c.code),
      nameByCode: new Map(courses.map((c) => [c.code, c.name])),
      isPending,
    }),
    [courses, isPending],
  );
}
