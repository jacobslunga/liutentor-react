import type { QuizDifficulty } from "@/types/quiz";

export const QUIZ_DIFFICULTY_INFO: Record<QuizDifficulty, { label: string; hint: string }> = {
  easy: { label: "Lätt", hint: "Centrala definitioner och grundbegrepp, en sak i taget." },
  medium: { label: "Medel", hint: "Begrepp, tolkning och samband — kräver att du förstått, inte bara sett." },
  hard: { label: "Svår", hint: "Antaganden, gränsfall och begrepp som lätt blandas ihop." },
};
