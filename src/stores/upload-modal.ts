import { create } from "zustand";

interface UploadModalState {
  isOpen: boolean;
  prefilledCourseCode: string;
  open: (courseCode?: string) => void;
  close: () => void;
}

export const useUploadModal = create<UploadModalState>((set) => ({
  isOpen: false,
  prefilledCourseCode: "",
  open: (courseCode = "") => set({ isOpen: true, prefilledCourseCode: courseCode }),
  close: () => set({ isOpen: false }),
}));
