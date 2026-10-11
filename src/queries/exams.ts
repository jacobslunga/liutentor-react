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
    staleTime: 5 * 60_000,
  });

export const examDetailQuery = (examId: string | number) =>
  queryOptions({
    queryKey: ["exam", String(examId)],
    queryFn: ({ signal }) => getExamDetail(examId, signal),
    staleTime: Infinity,
  });

const NO_COURSES: Awaited<ReturnType<typeof getCourses>> = [];

export function useCourseCodes() {
  const { data: courses = NO_COURSES, isPending } = useQuery(coursesQuery);

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
