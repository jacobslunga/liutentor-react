import { Cell, Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { GradeEntry } from "@/lib/course-stats";

export function CourseStatsGrades({ grades, total }: { grades: GradeEntry[]; total: number }) {
  const chartConfig = Object.fromEntries(
    grades.map((g) => [g.key, { label: `Betyg ${g.key}`, color: `var(--${g.token})` }]),
  ) satisfies ChartConfig;

  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
      <ol className="divide-y rounded-xl border">
        {grades.map((grade) => (
          <li key={grade.key} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: `var(--${grade.token})` }}
                />
                <span className="text-sm font-medium">{grade.key}</span>
              </div>
              <div className="flex items-baseline gap-3 tabular-nums">
                <span className="text-xs text-muted-foreground">
                  {grade.value.toLocaleString("sv-SE")}
                </span>
                <span className="w-14 text-right text-sm font-medium">{grade.pct.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${grade.pct}%`, background: `var(--${grade.token})` }}
              />
            </div>
          </li>
        ))}
      </ol>

      <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-65">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
          <Pie
            data={grades}
            dataKey="value"
            nameKey="key"
            innerRadius="72%"
            outerRadius="100%"
            paddingAngle={2}
            cornerRadius={4}
            strokeWidth={0}
            animationDuration={300}
          >
            {grades.map((grade) => (
              <Cell key={grade.key} fill={`var(--${grade.token})`} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                      {total.toLocaleString("sv-SE")}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                      studenter
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}
