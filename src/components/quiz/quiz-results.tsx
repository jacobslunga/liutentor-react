import { RotateCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuizStore } from "@/stores/quiz";
import type { MultipleChoiceQuizResponse } from "@/types/quiz";
import { QuizMarkdown } from "./quiz-markdown";

const CORRECT = "border-emerald-500/30 bg-emerald-500/10";
const WRONG = "border-destructive/30 bg-destructive/10";

export function QuizResults({ quizData }: { quizData: MultipleChoiceQuizResponse }) {
  const answers = useQuizStore((s) => s.answers);
  const { retake, reset } = useQuizStore.getState();
  const questions = quizData.quiz.questions;
  const meta = quizData.meta;

  const score = questions.filter((q) => answers[q.id] === q.answer).length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="w-full animate-in duration-200 fade-in-0">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-1 text-2xs font-medium text-muted-foreground/60">Resultat</p>
          <p className="text-4xl leading-none font-medium">
            {score} <span className="text-2xl font-medium text-muted-foreground">/ {questions.length}</span>
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {typeof meta?.sourceCount === "number" ? `${meta.sourceCount} tentor` : "Tentor"} ·{" "}
            {meta?.courseCode || "Okänd kurs"}
          </p>
        </div>
        <span className="text-3xl font-medium text-muted-foreground">{pct}%</span>
      </div>

      <div className="mb-8 rounded-md border border-dashed p-4">
        <p className="mb-0.5 text-sm font-medium">Nästa?</p>
        <p className="mb-4 text-xs text-muted-foreground">Gör om quizet eller skapa ett nytt med nya tentor.</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={retake}>
            <RotateCwIcon data-icon="inline-start" />
            Gör om
          </Button>
          <Button size="sm" className="ml-auto" onClick={reset}>
            Nytt quiz
          </Button>
        </div>
      </div>

      <p className="mb-3 text-2xs font-medium text-muted-foreground/60">Genomgång</p>
      <div className="flex flex-col gap-3">
        {questions.map((question, qi) => {
          const correct = answers[question.id] === question.answer;
          return (
            <div key={question.id} className="rounded-md border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline">Fråga {qi + 1}</Badge>
                <Badge
                  variant="outline"
                  className={correct ? cn(CORRECT, "text-emerald-700 dark:text-emerald-400") : cn(WRONG, "text-destructive")}
                >
                  {correct ? "Rätt" : "Fel"}
                </Badge>
              </div>
              <QuizMarkdown content={question.question} className="mb-3 text-sm leading-relaxed" />
              <div className="flex flex-col gap-1.5">
                {question.options.map((option, oi) => (
                  <div
                    key={`${question.id}-${oi}`}
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs",
                      oi === question.answer
                        ? cn(CORRECT, "font-medium")
                        : oi === answers[question.id]
                          ? WRONG
                          : "border-transparent bg-muted/40",
                    )}
                  >
                    <QuizMarkdown content={option} className="text-xs" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
