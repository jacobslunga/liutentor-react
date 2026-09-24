import type { Course, CourseExams, ExamDetail } from "@/types/exam";

/** Same-origin proxy to the Go exam service (see vite.config.ts / netlify.toml). */
const GO_API_BASE = "/api/go";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function goFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${GO_API_BASE}${path}`, { signal });
  if (!res.ok) throw new ApiError(res.status, `${path} failed (${res.status})`);
  const body = (await res.json()) as { data?: T };
  return body.data as T;
}

export async function getCourses(signal?: AbortSignal): Promise<Course[]> {
  const data = await goFetch<{ courses?: Course[] }>("/v1/courses/LIU", signal);
  return data?.courses ?? [];
}

/** Resolves to null for course codes the archive has no exams for. */
export async function getCourseExams(
  courseCode: string,
  signal?: AbortSignal,
): Promise<CourseExams | null> {
  try {
    return await goFetch<CourseExams>(
      `/v1/exams/LIU/${encodeURIComponent(courseCode)}`,
      signal,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function getExamDetail(
  examId: string | number,
  signal?: AbortSignal,
): Promise<ExamDetail> {
  return goFetch<ExamDetail>(
    `/v1/exams/${encodeURIComponent(String(examId))}`,
    signal,
  );
}
