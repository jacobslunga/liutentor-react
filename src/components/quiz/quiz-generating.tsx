import { RotateCwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuizStore } from "@/stores/quiz";

const STEP_ORDER = ["fetching_exams", "downloading_pdfs", "generating", "finalizing"];

export function QuizGenerating() {
  const status = useQuizStore((s) => s.generationStatus);
  const error = useQuizStore((s) => s.generationError);
  const reset = useQuizStore((s) => s.reset);
  const currentStep = status?.step ? STEP_ORDER.indexOf(status.step) : -1;

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center py-12">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2" aria-hidden>
          {STEP_ORDER.map((step, i) => (
            <div
              key={step}
              className={cn(
                "rounded-full bg-foreground transition-all duration-300",
                i < currentStep && "size-1.5",
                i === currentStep && "step-dot-active size-2",
                i > currentStep && "size-1.5 opacity-20",
              )}
            />
          ))}
        </div>

        <p className="shimmer-text text-sm font-medium">{status?.message ?? "Förbereder quiz..."}</p>

        {error ? (
          <div className="animate-in text-center duration-200 fade-in-0 slide-in-from-bottom-1">
            <p className="text-sm text-destructive">Kunde inte generera quizet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
              <RotateCwIcon data-icon="inline-start" />
              Försök igen
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={reset}>
            <XIcon data-icon="inline-start" />
            Avbryt
          </Button>
        )}
      </div>
    </div>
  );
}
