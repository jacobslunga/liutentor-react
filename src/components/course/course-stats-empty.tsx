import { ChartColumnIcon } from "lucide-react";

export function CourseStatsEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <ChartColumnIcon className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
