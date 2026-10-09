import { create } from "zustand";
import { persist } from "zustand/middleware";
import { randomAvatarColor } from "@/lib/avatar-colors";
import { DEFAULT_QUIZ_DIFFICULTY, type QuizDifficulty } from "@/types/quiz";
import {
  CHAT_MODELS,
  DEFAULT_MODEL_ID,
  type ChatModelId,
} from "@/lib/chat-models";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUser } from "@/stores/auth";

export type LayoutMode = "exam-with-facit" | "exam-only";
export type UiFont = "google-sans-flex" | "system";

interface SettingsState {
  uiFont: UiFont;
  setUiFont: (font: UiFont) => void;
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
      uiFont: "google-sans-flex",
      setUiFont: (uiFont) => set({ uiFont }),
      layoutMode: "exam-with-facit",
      showExplainPopover: true,
      blurFacitUntilHover: true,
      selectedModelId: DEFAULT_MODEL_ID,
      avatarColor: randomAvatarColor(),
      quizDifficulty: DEFAULT_QUIZ_DIFFICULTY,
      chatSidebarOpen: true,
      chatSidebarWidth: 256,
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setShowExplainPopover: (showExplainPopover) =>
        set({ showExplainPopover }),
      setBlurFacitUntilHover: (blurFacitUntilHover) =>
        set({ blurFacitUntilHover }),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setQuizDifficulty: (quizDifficulty) => set({ quizDifficulty }),
      setChatSidebarOpen: (chatSidebarOpen) => set({ chatSidebarOpen }),
      setChatSidebarWidth: (chatSidebarWidth) => set({ chatSidebarWidth }),
    }),
    {
      name: "liutentor-settings",
      version: 4,
      migrate: (persistedState) => {
        const settings = persistedState as Partial<SettingsState>;
        return {
          ...settings,
          uiFont: settings.uiFont === "system" ? "system" : "google-sans-flex",
        };
      },
    },
  ),
);

export const MOBILE_QUERY = "(max-width: 639px)";

export function useSelectedModel() {
  const user = useUser();
  const stored = useSettingsStore((s) => s.selectedModelId);
  const mobile = useMediaQuery(MOBILE_QUERY);

  const availableModels = CHAT_MODELS.filter((m) => !m.requiresAuth || !!user);
  // The model picker is hidden on mobile, which always uses the default.
  const selectedModelId =
    !mobile && availableModels.some((m) => m.id === stored)
      ? stored
      : DEFAULT_MODEL_ID;

  return { selectedModelId, availableModels };
}
