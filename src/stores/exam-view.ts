import { create } from "zustand";

interface ExamViewState {
  /** Header hidden until the pointer reaches the top edge. */
  focusMode: boolean;
  isHeaderMounted: boolean;
  /** Exam-only mode: the facit overlay on the right. */
  isFacitVisible: boolean;
  /** Opened with the keyboard/click, so pointer movement won't close it. */
  isFacitManual: boolean;
  /** Exam-with-facit mode: the solution is blurred until hovered. */
  solutionBlurred: boolean;
  /** The chat overlay mounts on first open and then stays mounted. */
  chatHasBeenOpened: boolean;

  toggleFocusMode: () => void;
  setHeaderMounted: (value: boolean) => void;
  setFacitVisible: (visible: boolean, manual?: boolean) => void;
  setSolutionBlurred: (value: boolean) => void;
  markChatOpened: () => void;
  reset: (blurSolution: boolean) => void;
}

/**
 * UI state for the exam page that several siblings read (header, panes,
 * overlays, key handler). Everything here changes on discrete events; the
 * per-pixel values (split and overlay widths, facit proximity) never enter
 * React state.
 */
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
