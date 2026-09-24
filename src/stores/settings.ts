import { create } from "zustand";
import { persist } from "zustand/middleware";
import { randomAvatarColor } from "@/lib/avatar-colors";
import { DEFAULT_QUIZ_DIFFICULTY, type QuizDifficulty } from "@/types/quiz";
import { CHAT_MODELS, DEFAULT_MODEL_ID, type ChatModelId } from "@/lib/chat-models";
import { useUser } from "@/stores/auth";

export type LayoutMode = "exam-with-facit" | "exam-only";

interface SettingsState {
  layoutMode: LayoutMode;
  showExplainPopover: boolean;
  blurFacitUntilHover: boolean;
  selectedModelId: ChatModelId;
  /** Local fallback until the profile has a saved avatar color. */
  avatarColor: string;
  /** Remembered so students who want easy quizzes get them every time. */
  quizDifficulty: QuizDifficulty;
  setLayoutMode: (mode: LayoutMode) => void;
  setShowExplainPopover: (value: boolean) => void;
  setBlurFacitUntilHover: (value: boolean) => void;
  setSelectedModelId: (id: ChatModelId) => void;
  setAvatarColor: (color: string) => void;
  setQuizDifficulty: (difficulty: QuizDifficulty) => void;
}

/** Rarely-changing user preferences, persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      layoutMode: "exam-with-facit",
      showExplainPopover: true,
      blurFacitUntilHover: true,
      selectedModelId: DEFAULT_MODEL_ID,
      avatarColor: randomAvatarColor(),
      quizDifficulty: DEFAULT_QUIZ_DIFFICULTY,
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setShowExplainPopover: (showExplainPopover) => set({ showExplainPopover }),
      setBlurFacitUntilHover: (blurFacitUntilHover) =>
        set({ blurFacitUntilHover }),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setQuizDifficulty: (quizDifficulty) => set({ quizDifficulty }),
    }),
    { name: "liutentor-settings", version: 1 },
  ),
);

/**
 * The model to actually use. A gated tier is dropped for signed-out users at
 * read time, so the picker never shows a level the backend would reject.
 */
export function useSelectedModel() {
  const user = useUser();
  const stored = useSettingsStore((s) => s.selectedModelId);

  const availableModels = CHAT_MODELS.filter((m) => !m.requiresAuth || !!user);
  const selectedModelId = availableModels.some((m) => m.id === stored)
    ? stored
    : DEFAULT_MODEL_ID;

  return { selectedModelId, availableModels };
}
