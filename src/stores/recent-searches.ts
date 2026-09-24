import { create } from "zustand";
import { persist } from "zustand/middleware";

const COURSE_CODE_REGEX = /^[A-Z0-9]{4,8}$/;
const MAX_RECENT = 3;

interface RecentSearch {
  courseCode: string;
  timestamp: number;
}

interface RecentSearchesState {
  latest: RecentSearch[];
  add: (courseCode: string) => void;
  clear: () => void;
}

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      latest: [],
      add: (courseCode) => {
        const code = courseCode.toUpperCase().trim();
        if (!COURSE_CODE_REGEX.test(code)) return;
        set((s) => ({
          latest: [
            { courseCode: code, timestamp: Date.now() },
            ...s.latest.filter((item) => item.courseCode !== code),
          ].slice(0, MAX_RECENT),
        }));
      },
      clear: () => set({ latest: [] }),
    }),
    { name: "liu_recent_searches_v2", version: 1 },
  ),
);
