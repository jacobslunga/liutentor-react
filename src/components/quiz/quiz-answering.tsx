import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useQuizStore } from "@/stores/quiz";
import type { QuizQuestion } from "@/types/quiz";
import { QuizMarkdown } from "./quiz-markdown";

export function QuizAnswering({ questions }: { questions: QuizQuestion[] }) {
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const answers = useQuizStore((s) => s.answers);
  const { setAnswer, next, previous, complete, reset } = useQuizStore.getState();
  const [confirmExit, setConfirmExit] = useState(false);

  const count = questions.length;
  const question = questions[currentIndex];
  const isLast = currentIndex === count - 1;
  const answeredCurrent = question ? answers[question.id] !== undefined : false;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const canSubmit = count > 0 && answeredCount === count;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => (answeredCount > 0 ? setConfirmExit(true) : reset())}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Avsluta
        </Button>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Fråga <span className="font-medium text-foreground">{currentIndex + 1}</span> / {count}
          </span>
          <span>
            {answeredCount}/{count} besvarade
          </span>
        </div>
        <Progress value={Math.round(((currentIndex + 1) / count) * 100)} />
      </div>

      {question && (
        <QuestionView
          key={question.id}
          question={question}
          selected={answers[question.id]}
          onAnswer={(i) => setAnswer(question.id, i)}
        />
      )}

      <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-3 border-t bg-background/80 py-4 backdrop-blur-sm">
        {!answeredCurrent && !isLast && (
          <span className="text-2xs text-muted-foreground/60">Svara för att fortsätta</span>
        )}
        <ButtonGroup>
          <Button variant="outline" size="sm" disabled={currentIndex === 0} onClick={previous}>
            <ArrowLeftIcon data-icon="inline-start" />
            Förra
          </Button>
          {isLast ? (
            <Button size="sm" disabled={!canSubmit} onClick={complete}>
              <CircleCheckIcon data-icon="inline-start" />
              Rätta quiz
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={!answeredCurrent} onClick={next}>
              Nästa
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          )}
        </ButtonGroup>
      </div>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent className="data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta quizet?</AlertDialogTitle>
            <AlertDialogDescription>
              Du har svarat på {answeredCount} av {count} frågor. Dina svar försvinner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt quizet</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>Avsluta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <QuizMarkdown content={question.question} className="mb-10 text-xl leading-snug font-medium text-foreground" />
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
                isSelected ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/40",
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
              <QuizMarkdown content={option} className="min-w-0 leading-relaxed" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
