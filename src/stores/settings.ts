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

  avatarColor: string;

  quizDifficulty: QuizDifficulty;

  chatSidebarOpen: boolean;

  chatSidebarWidth: number;
  setLayoutMode: (mode: LayoutMode) => void;
  setShowExplainPopover: (value: boolean) => void;
  setBlurFacitUntilHover: (value: boolean) => void;
  setSelectedModelId: (id: ChatModelId) => void;
  setAvatarColor: (color: string) => void;
  setQuizDifficulty: (difficulty: QuizDifficulty) => void;
  setChatSidebarOpen: (value: boolean) => void;
  setChatSidebarWidth: (value: number) => void;
}


export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      layoutMode: "exam-with-facit",
      showExplainPopover: true,
      blurFacitUntilHover: true,
      selectedModelId: DEFAULT_MODEL_ID,
      avatarColor: randomAvatarColor(),
      quizDifficulty: DEFAULT_QUIZ_DIFFICULTY,
      chatSidebarOpen: true,
      chatSidebarWidth: 256,
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setShowExplainPopover: (showExplainPopover) => set({ showExplainPopover }),
      setBlurFacitUntilHover: (blurFacitUntilHover) =>
        set({ blurFacitUntilHover }),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setQuizDifficulty: (quizDifficulty) => set({ quizDifficulty }),
      setChatSidebarOpen: (chatSidebarOpen) => set({ chatSidebarOpen }),
      setChatSidebarWidth: (chatSidebarWidth) => set({ chatSidebarWidth }),
    }),
    { name: "liutentor-settings", version: 1 },
  ),
);





export function useSelectedModel() {
  const user = useUser();
  const stored = useSettingsStore((s) => s.selectedModelId);

  const availableModels = CHAT_MODELS.filter((m) => !m.requiresAuth || !!user);
  const selectedModelId = availableModels.some((m) => m.id === stored)
    ? stored
    : DEFAULT_MODEL_ID;

  return { selectedModelId, availableModels };
}
