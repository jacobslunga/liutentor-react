import { DialogPresence } from "@/components/shared/dialog-presence";
import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuizStore } from "@/stores/quiz";
import type { QuizQuestion } from "@/types/quiz";
import { QuizMarkdown } from "./quiz-markdown";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Progress } from "@/components/ui/progress";

export function QuizAnswering({ questions }: { questions: QuizQuestion[] }) {
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const answers = useQuizStore((s) => s.answers);
  const { setAnswer, next, previous, complete, reset } =
    useQuizStore.getState();
  const [confirmExit, setConfirmExit] = useState(false);

  const count = questions.length;
  const question = questions[currentIndex];
  const isLast = currentIndex === count - 1;
  const answeredCurrent = question ? answers[question.id] !== undefined : false;
  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined,
  ).length;
  const canSubmit = count > 0 && answeredCount === count;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (answeredCount > 0 ? setConfirmExit(true) : reset())}
        >
          <ArrowLeftIcon />
          Avsluta
        </Button>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Fråga{" "}
            <span className="font-medium text-foreground">
              {currentIndex + 1}
            </span>{" "}
            / {count}
          </span>
          <span>
            {answeredCount}/{count} besvarade
          </span>
        </div>
        <Progress
          value={Math.round(((currentIndex + 1) / count) * 100)}
          aria-label="Quizförlopp"
        />
      </div>

      {question && (
        <QuestionView
          key={question.id}
          question={question}
          selected={answers[question.id]}
          onAnswer={(i) => setAnswer(question.id, i)}
        />
      )}

      <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-3 border-t bg-background py-4">
        {!answeredCurrent && !isLast && (
          <span className="text-2xs text-muted-foreground/60">
            Svara för att fortsätta
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === 0}
            onClick={previous}
          >
            <ArrowLeftIcon />
            Förra
          </Button>
          {isLast ? (
            <Button size="sm" disabled={!canSubmit} onClick={complete}>
              <CircleCheckIcon />
              Rätta quiz
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!answeredCurrent}
              onClick={next}
            >
              Nästa
              <ArrowRightIcon />
            </Button>
          )}
        </div>
      </div>

      <DialogPresence>
        {confirmExit && (
          <ConfirmDialog
            title="Avsluta quizet?"
            confirmLabel="Avsluta"
            cancelLabel="Fortsätt quizet"
            onConfirm={() => {
              setConfirmExit(false);
              reset();
            }}
            onCancel={() => setConfirmExit(false)}
          >
            Du har svarat på {answeredCount} av {count} frågor. Dina svar
            försvinner.
          </ConfirmDialog>
        )}
      </DialogPresence>
    </div>
  );
}

function QuestionView({
  question,
  selected,
  onAnswer,
}: {
  question: QuizQuestion;
  selected: number | undefined;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="animate-in duration-200 fade-in-0">
      <QuizMarkdown
        content={question.question}
        className="mb-10 text-xl leading-snug font-medium text-foreground"
      />
      <div className="flex flex-col gap-3" role="radiogroup">
        {question.options.map((option, i) => {
          const isSelected = selected === i;
          return (
            <div
              key={`${question.id}-${i}`}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              className={cn(
                "group flex w-full cursor-pointer items-center gap-4 rounded-lg border px-5 py-4 text-left text-base transition-colors duration-150 select-none sm:px-6 sm:py-5 sm:text-lg",
                isSelected
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "hover:bg-muted/40",
              )}
              onClick={() => onAnswer(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onAnswer(i);
                }
              }}
            >
              <span
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-foreground/30 bg-background group-hover:border-foreground/50",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <QuizMarkdown
                content={option}
                className="min-w-0 leading-relaxed"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
