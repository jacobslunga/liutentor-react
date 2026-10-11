import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useCourseCodes } from "@/queries/exams";
import { useRecentSearches } from "@/stores/recent-searches";

export interface CourseItem {
  code: string;
  name: string;
}

const MAX_RESULTS = 10;

export const resultOptionId = (listId: string, code: string) =>
  `${listId}-${code}`;

export function useCourseSearch() {
  const navigate = useNavigate();
  const addRecent = useRecentSearches((s) => s.add);
  const { codes, nameByCode } = useCourseCodes();
  const [query, setQuery] = useState("");

  const items = useMemo<CourseItem[]>(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];

    // Single pass, no full sort: prefix matches first, then other matches.
    const prefixed: string[] = [];
    const contained: string[] = [];
    for (const code of codes) {
      if (code.startsWith(q)) {
        prefixed.push(code);
        if (prefixed.length === MAX_RESULTS) break;
      } else if (contained.length < MAX_RESULTS && code.includes(q)) {
        contained.push(code);
      }
    }
    return prefixed
      .concat(contained)
      .slice(0, MAX_RESULTS)
      .map((code) => ({ code, name: nameByCode.get(code) ?? "" }));
  }, [codes, nameByCode, query]);

  const goToCourse = useCallback(
    (raw: string) => {
      const courseCode = raw.trim().toUpperCase();
      if (!courseCode) return;
      addRecent(courseCode);
      setQuery("");
      void navigate({ to: "/search/$courseCode", params: { courseCode } });
    },
    [addRecent, navigate],
  );

  return { query, setQuery, items, goToCourse, codes };
}
