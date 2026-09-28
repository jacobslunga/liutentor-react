import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  listCourseFiles,
  listStudyCourses,
  type CourseFile,
} from "@/lib/study-courses";
import { useUser } from "@/stores/auth";

export const studyCoursesKey = (userId: string) => ["study-courses", userId];
export const courseFilesKey = (courseId: string) => [
  "study-course-files",
  courseId,
];

export const studyCoursesQuery = (userId: string) =>
  queryOptions({
    queryKey: studyCoursesKey(userId),
    queryFn: () => listStudyCourses(userId),
  });

/** A course's material; polls while anything is still being indexed. */
export const courseFilesQuery = (courseId: string) =>
  queryOptions({
    queryKey: courseFilesKey(courseId),
    queryFn: () => listCourseFiles(courseId),
    refetchInterval: (query) =>
      (query.state.data as CourseFile[] | undefined)?.some(
        (f) => f.status === "processing",
      )
        ? 3000
        : false,
  });

/** The signed-in user's study courses; empty when signed out. */
export function useStudyCourses() {
  const user = useUser();
  const query = useQuery({
    ...studyCoursesQuery(user?.id ?? ""),
    enabled: !!user,
  });
  return {
    ...query,
    // A disabled query stays pending; signed out there is nothing to wait for.
    isPending: !!user && query.isPending,
    courses: query.data ?? [],
    user,
  };
}

/** One of the user's courses, from the cached list. */
export function useStudyCourse(courseId: string | null) {
  const { courses, isPending } = useStudyCourses();
  return {
    course: courseId ? (courses.find((c) => c.id === courseId) ?? null) : null,
    isPending,
  };
}
