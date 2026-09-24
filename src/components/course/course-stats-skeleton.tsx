import { Skeleton } from "@/components/ui/skeleton";

// Arbitrary heights: the skeleton hints at a bar chart without predicting the data.
const BAR_HEIGHTS = [46, 68, 34, 82, 55, 71, 40, 63, 88, 51, 37, 74, 59, 45];
const ROWS = [0, 1, 2, 3, 4];

function SectionHeading() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      <Skeleton className="h-2.5 w-32 rounded-full" />
      <Skeleton className="h-3 w-52 rounded-full" />
    </div>
  );
}

export function CourseStatsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-12" role="status" aria-busy="true">
      <span className="sr-only">Laddar statistik …</span>

      <section className="flex flex-col gap-5">
        <SectionHeading />
        <div className="flex h-75 w-full items-end gap-2" aria-hidden>
          {BAR_HEIGHTS.map((height, i) => (
            <Skeleton key={i} className="min-w-0 flex-1" style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeading />
        <div className="grid w-full gap-8 md:grid-cols-2 md:items-center md:gap-12" aria-hidden>
          <div className="flex flex-col gap-5 rounded-xl border p-4">
            {ROWS.map((row) => (
              <div key={row} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-3 w-8 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-full" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="mx-auto flex w-full max-w-xs items-center justify-center py-4">
            <Skeleton className="size-40 rounded-full" />
          </div>
        </div>
      </section>
    </div>
  );
}
