import { create } from "zustand";

interface ExamViewState {
  focusMode: boolean;
  isHeaderMounted: boolean;

  isFacitVisible: boolean;

  isFacitManual: boolean;

  solutionBlurred: boolean;

  chatHasBeenOpened: boolean;

  toggleFocusMode: () => void;
  setHeaderMounted: (value: boolean) => void;
  setFacitVisible: (visible: boolean, manual?: boolean) => void;
  setSolutionBlurred: (value: boolean) => void;
  markChatOpened: () => void;
  reset: (blurSolution: boolean) => void;
}

export const useExamViewStore = create<ExamViewState>((set) => ({
  focusMode: false,
  isHeaderMounted: true,
  isFacitVisible: false,
  isFacitManual: false,
  solutionBlurred: true,
  chatHasBeenOpened: false,

  toggleFocusMode: () =>
    set((s) => ({ focusMode: !s.focusMode, isHeaderMounted: s.focusMode })),
  setHeaderMounted: (isHeaderMounted) => set({ isHeaderMounted }),
  setFacitVisible: (isFacitVisible, manual) =>
    set((s) => ({
      isFacitVisible,
      isFacitManual: manual === undefined ? s.isFacitManual : manual,
    })),
  setSolutionBlurred: (solutionBlurred) => set({ solutionBlurred }),
  markChatOpened: () => set({ chatHasBeenOpened: true }),
  reset: (blurSolution) =>
    set({
      focusMode: false,
      isHeaderMounted: true,
      isFacitVisible: false,
      isFacitManual: false,
      solutionBlurred: blurSolution,
      chatHasBeenOpened: false,
    }),
}));
