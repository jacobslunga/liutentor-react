import type { Exam } from "@/types/exam";

/** The exam type ("TEN1", "KTR1", …) is the first word, unless it is a date. */
export function getExamPrefix(exam: Pick<Exam, "exam_name">): string {
  const firstWord = exam.exam_name?.trim().split(" ")[0] ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(firstWord) ? "" : firstWord;
}
