import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PassRatePoint } from "@/lib/course-stats";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/shared/app-dialog";


const RECENT_COUNT = 5;

const MAX_YEAR_LABELS = 10;

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "2-digit",
  month: "short",
});

interface ChartPoint extends PassRatePoint {
  index: number;
  rate: number;
}






export function CourseStatsPassRate({
  points,
  average,
  className,
}: {
  points: PassRatePoint[];
  average: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const data = useMemo(
    () =>
      points
        .filter(
          (p): p is PassRatePoint & { rate: number } => p.rate !== undefined,
        )
        .map((p, index): ChartPoint => ({ ...p, index })),
    [points],
  );
  const recent = data.slice(-RECENT_COUNT);

  const first = data[0];
  const last = data.at(-1);
  const summary = (shown: ChartPoint[]) =>
    shown.length
      ? `Andel godkända för de ${shown.length} senaste tentatillfällena: ${shown
          .map((p) => `${p.date} ${p.rate.toFixed(0)} %`)
          .join(", ")}. Snitt ${Math.round(average)} %.`
      : "Andel godkända per tentatillfälle.";

  return (
    <div className="flex flex-col gap-3">
      <PassRateBars
        data={recent}
        average={average}
        label={summary(recent)}
        tickFormatter={(i) => {
          const point = recent.find((p) => p.index === i);
          return point
            ? shortDateFormatter.format(new Date(point.timestamp))
            : "";
        }}
        showValues
        className={className}
      />

      <AverageLegend average={average} />

      {data.length > recent.length && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setOpen(true)}
        >
          Visa alla {data.length} tillfällen
        </Button>
      )}

      {open && first && last && (
        <AppDialog
          width="xlarge"
          title="Godkända över tid"
          description={`${data.length} tentatillfällen ${new Date(first.timestamp).getFullYear()}–${new Date(last.timestamp).getFullYear()}`}
          onClose={() => setOpen(false)}
          footer={
            <Button variant="outline" onClick={() => setOpen(false)}>
              Stäng
            </Button>
          }
        >
          <AllSittings data={data} average={average} />
        </AppDialog>
      )}
    </div>
  );
}

function AllSittings({
  data,
  average,
}: {
  data: ChartPoint[];
  average: number;
}) {
  const yearLabels = useMemo(() => {

    const yearStarts: { index: number; year: string }[] = [];
    for (const point of data) {
      const year = String(new Date(point.timestamp).getFullYear());
      if (yearStarts.at(-1)?.year !== year)
        yearStarts.push({ index: point.index, year });
    }
    const step = Math.ceil(yearStarts.length / MAX_YEAR_LABELS);
    return new Map(
      yearStarts.filter((_, i) => i % step === 0).map((y) => [y.index, y.year]),
    );
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <PassRateBars
        data={data}
        average={average}
        label={`Andel godkända per tentatillfälle, ${data.length} tillfällen. Snitt ${Math.round(average)} %.`}
        ticks={[...yearLabels.keys()]}
        tickFormatter={(i) => yearLabels.get(i) ?? ""}
        className="h-64"
      />
      <AverageLegend average={average} />

      <div className="max-h-72 overflow-y-auto rounded-md border text-xs">
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">
            Andel godkända per tentatillfälle
          </caption>
          <thead className="sticky top-0 bg-muted text-muted-foreground">
            <tr>
              <th scope="col" className="px-2.5 py-1.5 font-medium">
                Datum
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-medium">
                Studenter
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-medium">
                Godkända
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...data].reverse().map((point) => (
              <tr key={point.date}>
                <td className="px-2.5 py-1.5">{point.date}</td>
                <td className="px-2.5 py-1.5 text-right text-muted-foreground">
                  {point.students > 0
                    ? point.students.toLocaleString("sv-SE")
                    : "–"}
                </td>
                <td className="px-2.5 py-1.5 text-right">
                  {point.rate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PassRateBars({
  data,
  average,
  label,
  ticks,
  tickFormatter,
  showValues,
  className,
}: {
  data: ChartPoint[];
  average: number;
  label: string;
  ticks?: number[];
  tickFormatter: (index: number) => string;
  showValues?: boolean;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "h-44 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
        className,
      )}
    >
      <ResponsiveContainer initialDimension={{ width: 320, height: 176 }}>
        <BarChart
          data={data}
          margin={{ top: showValues ? 18 : 8, right: 8, bottom: 0, left: 0 }}
          barCategoryGap={data.length > 20 ? 1 : "20%"}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeOpacity={0.6}
          />
          <XAxis
            dataKey="index"
            ticks={ticks}
            interval={ticks ? undefined : 0}
            tickFormatter={tickFormatter}
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
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={<PassRateTooltip />}
          />
          <Bar
            dataKey="rate"
            fill="var(--brand)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            isAnimationActive={false}
          >
            {showValues && (
              <LabelList
                dataKey="rate"
                position="top"
                offset={6}
                className="fill-foreground tabular-nums"
                formatter={(v) => `${Math.round(Number(v))}%`}
              />
            )}
          </Bar>
          <ReferenceLine
            y={average}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 3"
            strokeOpacity={0.7}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AverageLegend({ average }: { average: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className="w-3 border-t border-dashed border-muted-foreground"
      />
      Snitt {Math.round(average)}%
    </div>
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
        <span className="text-lg leading-none font-semibold">
          {point.rate.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">godkända</span>
      </div>
      <div className="mt-1.5 text-muted-foreground">
        {point.names.join(" · ")}
      </div>
      {point.students > 0 && (
        <div className="text-muted-foreground">
          {point.students.toLocaleString("sv-SE")} studenter
        </div>
      )}
    </div>
  );
}
