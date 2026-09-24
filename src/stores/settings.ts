import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHAT_MODELS, DEFAULT_MODEL_ID, type ChatModelId } from "@/lib/chat-models";
import { useUser } from "@/stores/auth";

export type LayoutMode = "exam-with-facit" | "exam-only";

interface SettingsState {
  layoutMode: LayoutMode;
  showExplainPopover: boolean;
  blurFacitUntilHover: boolean;
  selectedModelId: ChatModelId;
  setLayoutMode: (mode: LayoutMode) => void;
  setShowExplainPopover: (value: boolean) => void;
  setBlurFacitUntilHover: (value: boolean) => void;
  setSelectedModelId: (id: ChatModelId) => void;
}

/** Rarely-changing user preferences, persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      layoutMode: "exam-with-facit",
      showExplainPopover: true,
      blurFacitUntilHover: true,
      selectedModelId: DEFAULT_MODEL_ID,
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setShowExplainPopover: (showExplainPopover) => set({ showExplainPopover }),
      setBlurFacitUntilHover: (blurFacitUntilHover) =>
        set({ blurFacitUntilHover }),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
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
