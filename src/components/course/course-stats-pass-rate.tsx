import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { passRateClass, type PassRatePoint } from "@/lib/course-stats";
import { cn } from "@/lib/utils";

const chartConfig = { rate: { label: "Godkända" } } satisfies ChartConfig;

// Shade bars by pass rate with absolute thresholds, so the same color means the
// same thing across courses. The ramp is theme-aware: stronger = higher.
const RATE_SHADES = [
  { min: 80, color: "var(--rate-5)" },
  { min: 60, color: "var(--rate-4)" },
  { min: 40, color: "var(--rate-3)" },
  { min: 20, color: "var(--rate-2)" },
  { min: 0, color: "var(--rate-1)" },
];

function barColor(rate: number) {
  return RATE_SHADES.find((shade) => rate >= shade.min)?.color ?? "var(--rate-1)";
}

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

interface ChartPoint extends PassRatePoint {
  index: number;
  rate: number;
}

/**
 * One equal-width bar per exam sitting (index as x) rather than a true time
 * axis: sittings are uneven in time, so a time axis leaves big gaps and packed
 * clusters. Year labels sit mid-span, with a thin line at each year boundary.
 */
export function CourseStatsPassRate({ points, average }: { points: PassRatePoint[]; average: number }) {
  const { data, yearTicks, yearLabels, yearBoundaries } = useMemo(() => {
    const data: ChartPoint[] = points
      .filter((p): p is PassRatePoint & { rate: number } => p.rate !== undefined)
      .map((p, index) => ({ ...p, index }));

    const groups: { year: number; start: number; end: number }[] = [];
    for (const point of data) {
      const year = new Date(point.timestamp).getFullYear();
      const current = groups.at(-1);
      if (current && current.year === year) current.end = point.index;
      else groups.push({ year, start: point.index, end: point.index });
    }

    return {
      data,
      yearTicks: groups.map((g) => (g.start + g.end) / 2),
      yearLabels: new Map(groups.map((g) => [(g.start + g.end) / 2, String(g.year)])),
      yearBoundaries: groups.slice(1).map((g) => g.start - 0.5),
    };
  }, [points]);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-75 w-full">
      <BarChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        {yearBoundaries.map((x) => (
          <ReferenceLine key={x} x={x} stroke="var(--border)" />
        ))}
        <XAxis
          dataKey="index"
          type="number"
          domain={[-0.5, Math.max(data.length - 1, 0) + 0.5]}
          ticks={yearTicks}
          tickFormatter={(t: number) => yearLabels.get(t) ?? ""}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ChartTooltip cursor={false} content={<PassRateTooltip />} />
        <Bar dataKey="rate" radius={4} maxBarSize={34} minPointSize={1} animationDuration={300}>
          {data.map((point) => (
            <Cell key={point.date} fill={barColor(point.rate)} />
          ))}
        </Bar>
        <ReferenceLine
          y={average}
          stroke="var(--muted-foreground)"
          strokeDasharray="5 4"
          label={<AverageLabel text={`Snitt ${Math.round(average)}%`} />}
        />
      </BarChart>
    </ChartContainer>
  );
}

/** Pill-shaped label pinned to the left end of the average line. */
function AverageLabel({ text, viewBox }: { text: string; viewBox?: { x?: number; y?: number } }) {
  const x = (viewBox?.x ?? 0) + 6;
  const y = viewBox?.y ?? 0;
  const width = text.length * 6.2 + 16;

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y - 10}
        width={width}
        height={20}
        rx={4}
        fill="var(--background)"
        fillOpacity={0.85}
        stroke="var(--border)"
      />
      <text
        x={x + width / 2}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={500}
        fill="var(--muted-foreground)"
      >
        {text}
      </text>
    </g>
  );
}

function PassRateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-40 rounded-lg border bg-background px-3 py-2.5 text-xs shadow-xl">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase">
        {dateFormatter.format(new Date(point.timestamp))}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={cn("text-lg leading-none font-semibold", passRateClass(point.rate))}>
          {point.rate.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">godkända</span>
      </div>
      <div className="mt-1.5 text-muted-foreground">{point.names.join(" · ")}</div>
      {point.students > 0 && (
        <div className="text-muted-foreground">
          {point.students.toLocaleString("sv-SE")} studenter
        </div>
      )}
    </div>
  );
}
