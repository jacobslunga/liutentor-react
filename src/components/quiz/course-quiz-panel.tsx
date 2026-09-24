import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { quizHistoryQuery, deleteQuiz } from "@/queries/quiz-history";
import { useUser } from "@/stores/auth";
import { useQuizStore } from "@/stores/quiz";
import { useSettingsStore } from "@/stores/settings";
import type { Exam } from "@/types/exam";
import type { StoredQuizItem } from "@/types/quiz";
import { QuizAnswering } from "./quiz-answering";
import { QuizGenerating } from "./quiz-generating";
import { QuizHistoryList } from "./quiz-history-list";
import { QuizResults } from "./quiz-results";
import { QuizStart } from "./quiz-start";

const MAX_SOURCE_EXAMS = 5;

/** Quiz tab on the course page (lazy-loaded, default export). */
export default function CourseQuizPanel({ courseCode, exams }: { courseCode: string; exams: Exam[] }) {
  const stage = useQuizStore((s) => s.stage);
  const quizData = useQuizStore((s) => s.quizData);
  const sessionKey = useQuizStore((s) => s.sessionKey);
  const activeQuizId = useQuizStore((s) => s.activeQuizId);
  const user = useUser();
  const queryClient = useQueryClient();
  const historyQuery = useMemo(() => quizHistoryQuery(user?.id ?? "", courseCode), [user?.id, courseCode]);
  const { data: history = [] } = useQuery({ ...historyQuery, enabled: !!user });

  const examPool = exams.filter((e) => e.pdf_url);

  // A quiz belongs to its course; leaving the tab or course abandons it.
  useEffect(() => {
    useQuizStore.getState().reset();
    return () => useQuizStore.getState().reset();
  }, [courseCode]);

  // A freshly generated quiz is saved server-side; mark its history row as active.
  useEffect(() => {
    if (!user) return;
    return useQuizStore.subscribe(async (s, prev) => {
      if (s.stage !== "answering" || prev.stage !== "generating") return;
      const rows = await queryClient.fetchQuery({ ...historyQuery, staleTime: 0 });
      if (rows[0]) useQuizStore.getState().setActiveQuizId(rows[0].id);
    });
  }, [user, queryClient, historyQuery]);

  function start() {
    if (!examPool.length) return;
    // A random 2–4 exams (or all when there are few) keeps quizzes varied.
    const shuffled = [...examPool].sort(() => Math.random() - 0.5);
    const count = Math.min(
      examPool.length <= 2 ? examPool.length : Math.floor(Math.random() * 3) + 2,
      MAX_SOURCE_EXAMS,
    );
    void useQuizStore.getState().generate(courseCode, {
      examIds: shuffled.slice(0, count).map((e) => e.id),
      difficulty: useSettingsStore.getState().quizDifficulty,
    });
  }

  async function remove(item: StoredQuizItem) {
    if (!user) return;
    if (useQuizStore.getState().activeQuizId === item.id) useQuizStore.getState().reset();
    const previous = queryClient.getQueryData(historyQuery.queryKey);
    queryClient.setQueryData(historyQuery.queryKey, (old: StoredQuizItem[] | undefined) =>
      old?.filter((q) => q.id !== item.id),
    );
    try {
      await deleteQuiz(user.id, item.id);
      toast.success("Quizet raderades");
    } catch {
      queryClient.setQueryData(historyQuery.queryKey, previous);
      toast.error("Kunde inte radera quizet");
    }
  }

  return (
    <div className="w-full">
      {stage === "setup" && (
        <div className="animate-in duration-200 fade-in-0">
          <QuizStart canStart={examPool.length > 0} onStart={start} />
          <QuizHistoryList
            history={history}
            signedIn={!!user}
            activeQuizId={activeQuizId}
            onLoad={(item) => useQuizStore.getState().loadFromHistory(item)}
            onDelete={(item) => void remove(item)}
          />
        </div>
      )}
      {stage === "generating" && <QuizGenerating />}
      {stage === "answering" && quizData && <QuizAnswering key={sessionKey} questions={quizData.quiz.questions} />}
      {stage === "results" && quizData && <QuizResults quizData={quizData} />}
    </div>
  );
}
