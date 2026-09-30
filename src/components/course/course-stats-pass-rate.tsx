import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PassRatePoint } from "@/lib/course-stats";
import { cn } from "@/lib/utils";

/** Sittings in the running average; below this many, the raw line is the trend. */
const TREND_WINDOW = 5;
const MIN_POINTS_FOR_TREND = 8;
/** Year labels past this count collide in the sidebar's width. */
const MAX_YEAR_LABELS = 5;

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

interface ChartPoint extends PassRatePoint {
  index: number;
  rate: number;
  trend?: number;
}

/**
 * Pass rate per exam sitting. With many sittings, each is a small gray dot and
 * one line in the primary color carries the story: a running average over the
 * last few sittings. Sittings sit evenly spaced (index as x) since they're
 * uneven in time; year ticks mark the first sitting of a year. A table of every
 * value sits under the chart, so hover is never the only way to read one.
 */
export function CourseStatsPassRate({
  points,
  average,
  className,
}: {
  points: PassRatePoint[];
  average: number;
  className?: string;
}) {
  const { data, showTrend, yearTicks, yearLabels } = useMemo(() => {
    const measured = points.filter(
      (p): p is PassRatePoint & { rate: number } => p.rate !== undefined,
    );
    const showTrend = measured.length >= MIN_POINTS_FOR_TREND;
    const data: ChartPoint[] = measured.map((p, index) => {
      if (!showTrend) return { ...p, index };
      const window = measured.slice(Math.max(0, index - TREND_WINDOW + 1), index + 1);
      const trend = window.reduce((sum, w) => sum + w.rate, 0) / window.length;
      return { ...p, index, trend };
    });

    // First sitting of each year, thinned so labels never collide.
    const yearStarts: { index: number; year: string }[] = [];
    for (const point of data) {
      const year = String(new Date(point.timestamp).getFullYear());
      if (yearStarts.at(-1)?.year !== year) yearStarts.push({ index: point.index, year });
    }
    const step = Math.ceil(yearStarts.length / MAX_YEAR_LABELS);
    const shown = yearStarts.filter((_, i) => i % step === 0);

    return {
      data,
      showTrend,
      yearTicks: shown.map((y) => y.index),
      yearLabels: new Map(shown.map((y) => [y.index, y.year])),
    };
  }, [points]);

  const first = data[0];
  const last = data.at(-1);
  const summary =
    first && last
      ? `Andel godkända per tentatillfälle, ${data.length} tillfällen ${new Date(first.timestamp).getFullYear()}–${new Date(last.timestamp).getFullYear()}. Snitt ${Math.round(average)} %, senaste ${last.rate.toFixed(0)} %.`
      : "Andel godkända per tentatillfälle.";

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={summary}
        className={cn(
          "h-75 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
      >
        <ResponsiveContainer initialDimension={{ width: 320, height: 200 }}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
            <XAxis
              dataKey="index"
              type="number"
              domain={[-0.5, Math.max(data.length - 1, 0) + 0.5]}
              ticks={yearTicks}
              tickFormatter={(t: number) => yearLabels.get(t) ?? ""}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <ReferenceLine y={average} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={<PassRateTooltip showTrend={showTrend} />}
            />
            {showTrend ? (
              <>
                <Line
                  dataKey="rate"
                  stroke="none"
                  dot={{ r: 2, fill: "var(--chart-point)", stroke: "none" }}
                  activeDot={{ r: 4.5, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="trend"
                  type="monotone"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <Line
                dataKey="rate"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {showTrend && (
          <>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-chart-point" />
              Tentatillfälle
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3 rounded-full bg-primary" />
              Trend ({TREND_WINDOW} senaste)
            </li>
          </>
        )}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-px w-3 bg-muted-foreground/50" />
          Snitt {Math.round(average)}%
        </li>
      </ul>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
          Visa som tabell
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">Andel godkända per tentatillfälle</caption>
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th scope="col" className="px-2.5 py-1.5 font-medium">Datum</th>
                <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Godkända</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...data].reverse().map((point) => (
                <tr key={point.date}>
                  <td className="px-2.5 py-1.5">{point.date}</td>
                  <td className="px-2.5 py-1.5 text-right">{point.rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function PassRateTooltip({
  active,
  payload,
  showTrend,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  showTrend: boolean;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-40 rounded-lg border bg-background px-3 py-2.5 text-xs shadow-xl">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase">
        {dateFormatter.format(new Date(point.timestamp))}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-lg leading-none font-semibold">{point.rate.toFixed(1)}%</span>
        <span className="text-muted-foreground">godkända</span>
      </div>
      {showTrend && point.trend !== undefined && (
        <div className="mt-1 text-muted-foreground">Trend {point.trend.toFixed(1)}%</div>
      )}
      <div className="mt-1.5 text-muted-foreground">{point.names.join(" · ")}</div>
      {point.students > 0 && (
        <div className="text-muted-foreground">
          {point.students.toLocaleString("sv-SE")} studenter
        </div>
      )}
    </div>
  );
}
