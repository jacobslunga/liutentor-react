export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number;
}

export type QuizDifficulty = "easy" | "medium" | "hard";

export const QUIZ_DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];

export const DEFAULT_QUIZ_DIFFICULTY: QuizDifficulty = "medium";

export interface QuizMeta {
  courseCode: string;
  sourceExamIds: number[];
  sourceCount: number;
  model: string;
  /** Absent on quizzes generated before difficulty existed. */
  difficulty?: QuizDifficulty;
}

export interface MultipleChoiceQuizResponse {
  quiz: { questions: QuizQuestion[] };
  meta: QuizMeta;
}

export interface StoredQuizItem {
  id: string;
  createdAt: string;
  data: MultipleChoiceQuizResponse;
}
