import type { Exam } from "@/types/exam";


export function getExamPrefix(exam: Pick<Exam, "exam_name">): string {
  const firstWord = exam.exam_name?.trim().split(" ")[0] ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(firstWord) ? "" : firstWord;
}
