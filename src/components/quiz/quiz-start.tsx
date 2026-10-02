import { SegmentedControl } from "@primer/react";
import { useSettingsStore } from "@/stores/settings";
import { QUIZ_DIFFICULTY_INFO } from "@/lib/quiz";
import { QUIZ_DIFFICULTIES } from "@/types/quiz";
import { Button } from "@/components/ui/button";

export function QuizStart({
  canStart,
  onStart,
}: {
  canStart: boolean;
  onStart: () => void;
}) {
  const difficulty = useSettingsStore((s) => s.quizDifficulty);
  const setDifficulty = useSettingsStore((s) => s.setQuizDifficulty);

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Ett AI-genererat quiz baserat på ett slumpat urval tentor.
      </p>

      {canStart ? (
        <div className="mt-6 flex w-[80%] flex-col items-center">
          <p className="text-xs font-medium text-muted-foreground">
            Svårighetsgrad
          </p>
          <SegmentedControl
            aria-label="Svårighetsgrad"
            fullWidth
            className="mt-2"
            onChange={(i) => setDifficulty(QUIZ_DIFFICULTIES[i])}
          >
            {QUIZ_DIFFICULTIES.map((level) => (
              <SegmentedControl.Button
                key={level}
                selected={level === difficulty}
              >
                {QUIZ_DIFFICULTY_INFO[level].label}
              </SegmentedControl.Button>
            ))}
          </SegmentedControl>
          <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
            {QUIZ_DIFFICULTY_INFO[difficulty].hint}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Inga tentor hittades med PDF.
        </p>
      )}

      <Button className="mt-6" disabled={!canStart} onClick={onStart}>
        Generera quiz
      </Button>
    </div>
  );
}
