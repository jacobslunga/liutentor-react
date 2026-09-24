import { create } from "zustand";
import { AI_API_BASE, getAnonymousId, readSseEvents } from "@/lib/chat-api";
import { getAuthHeaders } from "@/lib/supabase";
import type { MultipleChoiceQuizResponse, QuizDifficulty, StoredQuizItem } from "@/types/quiz";

export type QuizStage = "setup" | "generating" | "answering" | "results";
export interface QuizStatus {
  step: string;
  message: string;
}

interface QuizState {
  stage: QuizStage;
  quizData: MultipleChoiceQuizResponse | null;
  /** History row of the quiz being answered, if it has one. */
  activeQuizId: string | null;
  /** Bumped per attempt so the answering view remounts fresh. */
  sessionKey: number;
  currentIndex: number;
  answers: Record<number, number>;
  isGenerating: boolean;
  generationError: string | null;
  generationStatus: QuizStatus | null;

  generate: (courseCode: string, payload: { examIds: number[]; difficulty: QuizDifficulty }) => Promise<void>;
  loadFromHistory: (item: StoredQuizItem) => void;
  setActiveQuizId: (id: string | null) => void;
  setAnswer: (questionId: number, optionIndex: number) => void;
  next: () => void;
  previous: () => void;
  complete: () => void;
  retake: () => void;
  reset: () => void;
  abort: () => void;
}

let abortController: AbortController | null = null;

const IDLE = {
  stage: "setup" as QuizStage,
  quizData: null,
  activeQuizId: null,
  sessionKey: 0,
  currentIndex: 0,
  answers: {},
  isGenerating: false,
  generationError: null,
  generationStatus: null,
};

export const useQuizStore = create<QuizState>((set, get) => ({
  ...IDLE,

  generate: async (courseCode, payload) => {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    set((s) => ({
      ...IDLE,
      stage: "generating",
      isGenerating: true,
      sessionKey: s.sessionKey + 1,
    }));

    try {
      const response = await fetch(`${AI_API_BASE}/quiz/multiple-choice/${encodeURIComponent(courseCode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anonymous-user-id": getAnonymousId(),
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`Request failed: ${response.statusText}`);

      for await (const { event, data } of readSseEvents(response.body)) {
        if (event === "status") {
          set({ generationStatus: data as QuizStatus });
        } else if (event === "result") {
          set({ quizData: data as MultipleChoiceQuizResponse, isGenerating: false, stage: "answering" });
        } else if (event === "error") {
          set({
            generationError: (data as { message?: string }).message ?? "Unknown error",
            isGenerating: false,
          });
        }
      }
      if (get().isGenerating) set({ isGenerating: false });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      set({ generationError: (err as Error)?.message ?? "Failed to generate quiz", isGenerating: false });
    }
  },

  loadFromHistory: (item) => {
    abortController?.abort();
    abortController = null;
    set((s) => ({
      ...IDLE,
      stage: "answering",
      quizData: item.data,
      activeQuizId: item.id,
      sessionKey: s.sessionKey + 1,
    }));
  },

  setActiveQuizId: (activeQuizId) => set({ activeQuizId }),
  setAnswer: (questionId, optionIndex) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: optionIndex } })),
  next: () =>
    set((s) => {
      const question = s.quizData?.quiz.questions[s.currentIndex];
      if (!question || s.answers[question.id] === undefined) return s;
      const last = (s.quizData?.quiz.questions.length ?? 1) - 1;
      return { currentIndex: Math.min(s.currentIndex + 1, last) };
    }),
  previous: () => set((s) => ({ currentIndex: Math.max(0, s.currentIndex - 1) })),
  complete: () => set({ stage: "results" }),
  retake: () => set((s) => ({ stage: "answering", currentIndex: 0, answers: {}, sessionKey: s.sessionKey + 1 })),
  reset: () => {
    abortController?.abort();
    abortController = null;
    set(IDLE);
  },
  abort: () => {
    abortController?.abort();
    abortController = null;
    set({ isGenerating: false });
  },
}));
