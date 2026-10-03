import {
  ArrowRightIcon,
  SignalHighIcon,
  SignalLowIcon,
  SignalMediumIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { QUIZ_DIFFICULTY_INFO } from "@/lib/quiz";
import { useSettingsStore } from "@/stores/settings";
import { QUIZ_DIFFICULTIES, type QuizDifficulty } from "@/types/quiz";

const LEVEL_ICONS: Record<QuizDifficulty, typeof SignalLowIcon> = {
  easy: SignalLowIcon,
  medium: SignalMediumIcon,
  hard: SignalHighIcon,
};





export function QuizStart({
  courseCode,
  poolSize,
  onStart,
}: {
  courseCode: string;

  poolSize: number;
  onStart: () => void;
}) {
  const difficulty = useSettingsStore((s) => s.quizDifficulty);
  const setDifficulty = useSettingsStore((s) => s.setQuizDifficulty);
  const canStart = poolSize > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Testa dig själv på {courseCode}
        </CardTitle>
        <CardDescription>
          Flervalsfrågor som AI skapar ur kursens gamla tentor. Du ser direkt
          vad du hade rätt på och kan göra om quizet.
        </CardDescription>
      </CardHeader>

      {canStart ? (
        <>
          <CardContent className="space-y-2.5">
            <p id="quiz-level" className="text-sm font-medium">
              Välj nivå
            </p>
            <ToggleGroup
              type="single"
              aria-labelledby="quiz-level"
              className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3"
              value={difficulty}
              onValueChange={(value) =>
                value && setDifficulty(value as QuizDifficulty)
              }
            >
              {QUIZ_DIFFICULTIES.map((level) => {
                const Icon = LEVEL_ICONS[level];
                const { label, hint } = QUIZ_DIFFICULTY_INFO[level];
                return (
                  <ToggleGroupItem
                    key={level}
                    value={level}
                    className="h-auto flex-col items-start gap-1.5 rounded-lg border bg-card px-3 py-3 text-left whitespace-normal shadow-raised transition-[border-color,background-color,box-shadow] hover:bg-muted/50 data-[state=on]:border-brand data-[state=on]:bg-brand/5 data-[state=on]:shadow-none"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-muted-foreground group-data-[state=on]/toggle:text-brand" />
                      {label}
                    </span>
                    <span className="text-xs leading-relaxed font-normal text-muted-foreground">
                      {hint}
                    </span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {poolSize > 2
                ? "Frågorna tas från 2–4 slumpade tentor."
                : `Frågorna tas från kursens ${poolSize === 1 ? "enda tenta" : "två tentor"}.`}
            </p>
            <Button onClick={onStart}>
              Starta quiz
              <ArrowRightIcon />
            </Button>
          </CardFooter>
        </>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Den här kursen har inga tentor med PDF än, så det går inte att
            skapa ett quiz.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
