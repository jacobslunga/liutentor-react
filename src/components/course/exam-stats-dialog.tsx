import { MinusIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { passRateClass } from "@/lib/course-stats";
import { cn } from "@/lib/utils";

const GRADE_ORDER = ["3", "4", "5", "G", "VG", "U"];

const GRADE_COLORS: Record<string, string> = {
  "3": "var(--rate-3)",
  "4": "var(--rate-4)",
  "5": "var(--rate-5)",
  G: "var(--rate-2)",
  VG: "var(--rate-1)",
  U: "var(--rate-1)",
};

interface ExamStatsDialogProps {
  statistics: Record<string, number> | null;
  date: string;
  passRate: number;
}

export function ExamStatsDialog({ statistics, date, passRate }: ExamStatsDialogProps) {
  const stats = statistics ?? {};
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  if (total === 0) return <MinusIcon className="size-4 text-muted-foreground/30" />;

  const chartData = GRADE_ORDER.filter((g) => (stats[g] ?? 0) > 0).map((grade) => ({
    grade,
    count: stats[grade] ?? 0,
    color: GRADE_COLORS[grade] ?? "var(--rate-3)",
  }));
  const maxCount = Math.max(...chartData.map((d) => d.count));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("tabular-nums", passRateClass(passRate))}
          // The row itself navigates to the exam.
          onClick={(e) => e.stopPropagation()}
        >
          {passRate.toFixed(1)}%
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Tentastatistik</DialogTitle>
          <DialogDescription>Betygsfördelning {date}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{total} studenter</span>
            <span className={cn("font-mono", passRateClass(passRate))}>
              {passRate}% godkänt
            </span>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex h-32 items-end gap-2">
              {chartData.map(({ grade, count, color }) => (
                <div key={grade} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-2xs text-muted-foreground">{count}</span>
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: `${(count / maxCount) * 88}px`, backgroundColor: color }}
                  />
                  <span className="text-2xs text-muted-foreground">{grade}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {chartData.map(({ grade, count, color }) => (
              <div key={grade} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-md" style={{ backgroundColor: color }} />
                  <span>Betyg {grade}</span>
                </div>
                <span className="text-muted-foreground">
                  {count} ({((count / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-xs text-muted-foreground">
            Data från{" "}
            <a
              href="https://ysektionen.se/student/tentastatistik/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Y-Sektionen
            </a>
          </p>
          <DialogClose asChild>
            <Button variant="outline">Stäng</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
