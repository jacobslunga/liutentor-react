import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  QUIZ_DIFFICULTIES,
  type MultipleChoiceQuizResponse,
  type QuizDifficulty,
  type StoredQuizItem,
} from "@/types/quiz";

/** Anything the text column holds that isn't a known level is dropped. */
function normalizeDifficulty(value: unknown): QuizDifficulty | undefined {
  return QUIZ_DIFFICULTIES.includes(value as QuizDifficulty) ? (value as QuizDifficulty) : undefined;
}

export const quizHistoryQuery = (userId: string, courseCode: string) =>
  queryOptions({
    queryKey: ["quiz-history", userId, courseCode],
    queryFn: async (): Promise<StoredQuizItem[]> => {
      const { data, error } = await supabase
        .from("ai_quiz_logs")
        .select("id, created_at, quiz, source_count, source_exam_ids, course_code, model, difficulty")
        .eq("user_id", userId)
        .eq("course_code", courseCode)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? [])
        .filter((row) => row?.id && row?.created_at && row?.quiz)
        .map((row) => {
          const quiz = row.quiz as MultipleChoiceQuizResponse;
          return {
            id: row.id,
            createdAt: row.created_at,
            data: {
              ...quiz,
              meta: {
                sourceCount: quiz?.meta?.sourceCount ?? row.source_count ?? 0,
                sourceExamIds: quiz?.meta?.sourceExamIds ?? row.source_exam_ids ?? [],
                courseCode: quiz?.meta?.courseCode ?? row.course_code ?? courseCode,
                model: quiz?.meta?.model ?? row.model ?? "okand-modell",
                difficulty: normalizeDifficulty(quiz?.meta?.difficulty) ?? normalizeDifficulty(row.difficulty),
              },
            },
          };
        });
    },
  });

/**
 * Deletes a saved quiz. `.select()` matters: when RLS filters a delete,
 * PostgREST reports no error and affects no rows, so the returned rows are the
 * only way to tell a real delete from a silent no-op.
 */
export async function deleteQuiz(userId: string, id: string) {
  const { data, error } = await supabase
    .from("ai_quiz_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error || !data?.length) throw error ?? new Error("Nothing deleted");
}
