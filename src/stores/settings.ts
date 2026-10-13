import { useMemo } from "react";
import { create } from "zustand";
import {
  readChatEffort,
  readChatModel,
  saveChatEffort,
  saveChatModel,
} from "@/lib/chat-model-cookie";
import { persist } from "zustand/middleware";
import { randomAvatarColor } from "@/lib/avatar-colors";
import { DEFAULT_QUIZ_DIFFICULTY, type QuizDifficulty } from "@/types/quiz";
import {
  CHAT_EFFORTS,
  CHAT_MODELS,
  DEFAULT_EFFORT,
  DEFAULT_MODEL_ID,
  type ChatEffort,
  type ChatModelId,
} from "@/lib/chat-models";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUser } from "@/stores/auth";

export type LayoutMode = "exam-with-facit" | "exam-only";

interface SettingsState {
  layoutMode: LayoutMode;
  showExplainPopover: boolean;
  blurFacitUntilHover: boolean;
  selectedModelId: ChatModelId;
  selectedEffort: ChatEffort;

  avatarColor: string;

  quizDifficulty: QuizDifficulty;

  chatSidebarOpen: boolean;

  chatSidebarWidth: number;
  setLayoutMode: (mode: LayoutMode) => void;
  setShowExplainPopover: (value: boolean) => void;
  setBlurFacitUntilHover: (value: boolean) => void;
  setSelectedModelId: (id: ChatModelId) => void;
  setSelectedEffort: (effort: ChatEffort) => void;
  setAvatarColor: (color: string) => void;
  setQuizDifficulty: (difficulty: QuizDifficulty) => void;
  setChatSidebarOpen: (value: boolean) => void;
  setChatSidebarWidth: (value: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist<SettingsState, [], [], Partial<SettingsState>>(
    (set) => ({
      layoutMode: "exam-with-facit",
      showExplainPopover: true,
      blurFacitUntilHover: true,
      selectedModelId: readChatModel(),
      selectedEffort: readChatEffort(),
      avatarColor: randomAvatarColor(),
      quizDifficulty: DEFAULT_QUIZ_DIFFICULTY,
      chatSidebarOpen: true,
      chatSidebarWidth: 256,
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setShowExplainPopover: (showExplainPopover) =>
        set({ showExplainPopover }),
      setBlurFacitUntilHover: (blurFacitUntilHover) =>
        set({ blurFacitUntilHover }),
      setSelectedModelId: (selectedModelId) => {
        saveChatModel(selectedModelId);
        set({ selectedModelId });
      },
      setSelectedEffort: (selectedEffort) => {
        saveChatEffort(selectedEffort);
        set({ selectedEffort });
      },
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setQuizDifficulty: (quizDifficulty) => set({ quizDifficulty }),
      setChatSidebarOpen: (chatSidebarOpen) => set({ chatSidebarOpen }),
      setChatSidebarWidth: (chatSidebarWidth) => set({ chatSidebarWidth }),
    }),
    {
      name: "liutentor-settings",
      version: 6,
      partialize: ({
        selectedModelId: _selectedModelId,
        selectedEffort: _selectedEffort,
        ...settings
      }) => settings,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<SettingsState>),
        selectedModelId: currentState.selectedModelId,
        selectedEffort: currentState.selectedEffort,
      }),
      migrate: (persistedState) => {
        const {
          uiFont: _uiFont,
          setUiFont: _setUiFont,
          ...settings
        } = persistedState as Partial<SettingsState> & {
          uiFont?: unknown;
          setUiFont?: unknown;
        };
        return settings;
      },
    },
  ),
);

export const MOBILE_QUERY = "(max-width: 639px)";

export function useSelectedModel() {
  const user = useUser();
  const storedModel = useSettingsStore((s) => s.selectedModelId);
  const storedEffort = useSettingsStore((s) => s.selectedEffort);
  const mobile = useMediaQuery(MOBILE_QUERY);

  const signedIn = !!user;
  const availableEfforts = useMemo(
    () => CHAT_EFFORTS.filter((e) => !e.requiresAuth || signedIn),
    [signedIn],
  );
  // The model picker is hidden on mobile, which always uses the defaults.
  const selectedModelId =
    !mobile && CHAT_MODELS.some((m) => m.id === storedModel)
      ? storedModel
      : DEFAULT_MODEL_ID;
  const selectedEffort =
    !mobile && availableEfforts.some((e) => e.id === storedEffort)
      ? storedEffort
      : DEFAULT_EFFORT;

  return {
    selectedModelId,
    selectedEffort,
    availableModels: CHAT_MODELS,
    availableEfforts,
  };
}
