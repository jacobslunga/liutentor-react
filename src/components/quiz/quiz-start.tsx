import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore } from "@/stores/settings";
import { QUIZ_DIFFICULTY_INFO } from "@/lib/quiz";
import { QUIZ_DIFFICULTIES, type QuizDifficulty } from "@/types/quiz";

export function QuizStart({ canStart, onStart }: { canStart: boolean; onStart: () => void }) {
  const difficulty = useSettingsStore((s) => s.quizDifficulty);
  const setDifficulty = useSettingsStore((s) => s.setQuizDifficulty);

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Ett AI-genererat quiz baserat på ett slumpat urval tentor.
      </p>

      {canStart ? (
        <div className="mt-6 flex w-[80%] flex-col items-center">
          <p className="text-xs font-medium text-muted-foreground">Svårighetsgrad</p>
          <Tabs
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as QuizDifficulty)}
            className="mt-2 w-full"
            aria-label="Svårighetsgrad"
          >
            <TabsList className="w-full">
              {QUIZ_DIFFICULTIES.map((level) => (
                <TabsTrigger key={level} value={level} className="flex-1">
                  {QUIZ_DIFFICULTY_INFO[level].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">{QUIZ_DIFFICULTY_INFO[difficulty].hint}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Inga tentor hittades med PDF.</p>
      )}

      <Button size="lg" className="mt-6" disabled={!canStart} onClick={onStart}>
        Generera quiz
      </Button>
    </div>
  );
}
