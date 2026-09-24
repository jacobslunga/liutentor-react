import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useCourseCodes } from "@/queries/exams";
import { useRecentSearches } from "@/stores/recent-searches";

export interface CourseItem {
  code: string;
  name: string;
}

const MAX_RESULTS = 10;

/** Shared search state for the course search inputs. */
export function useCourseSearch() {
  const navigate = useNavigate();
  const addRecent = useRecentSearches((s) => s.add);
  const { codes, nameByCode } = useCourseCodes();
  const [query, setQuery] = useState("");

  const items = useMemo<CourseItem[]>(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    // Exact and prefix matches first, then codes containing the query.
    return codes
      .filter((code) => code.includes(q))
      .sort((a, b) => Number(b.startsWith(q)) - Number(a.startsWith(q)))
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
