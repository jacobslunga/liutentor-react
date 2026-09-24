import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowLeftRightIcon,
  ArrowUpIcon,
  ChartLineIcon,
  FileTextIcon,
  InboxIcon,
  LoaderCircleIcon,
  UploadIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { CourseExamsTable } from "@/components/course/course-exams-table";
import { CourseStatsSkeleton } from "@/components/course/course-stats-skeleton";
import { HeaderCourseSearch } from "@/components/search/course-search";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeCourseStats, passRateClass } from "@/lib/course-stats";
import { cn } from "@/lib/utils";
import { courseExamsQuery } from "@/queries/exams";
import { useExamSortPreference, type ExamSortBy, type ExamSortDirection } from "@/stores/exam-sort";
import { useRecentSearches } from "@/stores/recent-searches";
import { useUploadModal } from "@/stores/upload-modal";
import type { CourseExams } from "@/types/exam";

const CourseStats = lazy(() => import("@/components/course/course-stats"));

type CourseTab = "exams" | "stats";

export const Route = createFileRoute("/_search/search/$courseCode")({
  params: {
    parse: ({ courseCode }) => ({ courseCode: courseCode.toUpperCase() }),
    stringify: ({ courseCode }) => ({ courseCode }),
  },
  validateSearch: (search: Record<string, unknown>): { tab?: "stats" } =>
    search.tab === "stats" ? { tab: "stats" } : {},
  component: CoursePage,
});

function CoursePage() {
  const { courseCode } = Route.useParams();
  const { data, isPending } = useQuery(courseExamsQuery(courseCode));
  const addRecentSearch = useRecentSearches((s) => s.add);

  useEffect(() => {
    document.title = `${courseCode} | LiU Tentor`;
    addRecentSearch(courseCode);
  }, [courseCode, addRecentSearch]);

  return (
    <div className="container mx-auto max-w-3xl px-4 pt-2 pb-8 md:px-8 md:py-8 lg:px-4">
      <div className="sticky top-0 z-30 mb-4 h-12 bg-background pt-2 md:hidden">
        <HeaderCourseSearch className="mx-auto w-full max-w-xl" />
      </div>

      {isPending ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <CourseContent courseCode={courseCode} course={data} />
      ) : (
        <NoExams courseCode={courseCode} />
      )}
    </div>
  );
}

function NoExams({ courseCode }: { courseCode: string }) {
  const openUploadModal = useUploadModal((s) => s.open);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-8 py-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <InboxIcon className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-medium">Vi saknar tentor för {courseCode}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Har du en gammal tenta eller ett facit? Ladda upp den här så blir nästa student som
          söker på {courseCode} hjälpt direkt.
        </p>
      </div>
      <Button onClick={() => openUploadModal(courseCode)}>
        <UploadIcon data-icon="inline-start" />
        Ladda upp tenta
      </Button>
    </div>
  );
}

function CourseContent({ courseCode, course }: { courseCode: string; course: CourseExams }) {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const activeTab: CourseTab = tab === "stats" ? "stats" : "exams";
  const openUploadModal = useUploadModal((s) => s.open);
  const sort = useExamSortPreference("course-page");

  const exams = course.exams;
  const { overallPassRate } = useMemo(() => computeCourseStats(exams), [exams]);
  const avgPassRate = overallPassRate === undefined ? null : Math.round(overallPassRate);
  const examsWithSolutions = exams.filter((e) => e.has_solution).length;

  function setTab(value: string) {
    // Keep the tab in the URL so it can be linked and refreshed.
    void navigate({ search: value === "stats" ? { tab: "stats" } : {}, replace: true });
  }

  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-4xl flex-col items-start gap-8">
        <div className="w-full">
          <h1 className="w-full text-3xl leading-tight font-semibold wrap-break-word sm:text-4xl">
            {course.courseName}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium">{courseCode}</span>
            <Dot />
            <span>
              <span className="font-bold text-foreground">{exams.length}</span> tentor
            </span>
            <Dot />
            <span>
              <span className="font-bold text-foreground">{examsWithSolutions}</span> med facit
            </span>
            {avgPassRate !== null && (
              <>
                <Dot />
                <span>
                  <span className={cn("font-bold", passRateClass(avgPassRate))}>{avgPassRate}%</span>{" "}
                  godkända i snitt
                </span>
              </>
            )}
          </p>
        </div>

        <div className="-mt-4 flex w-full flex-col gap-2">
          <div className="sticky top-12 z-30 flex flex-col gap-3 bg-background/90 pt-2 pb-2.5 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:top-0">
            <Tabs value={activeTab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="exams">
                  <FileTextIcon />
                  Tentor
                </TabsTrigger>
                <TabsTrigger value="stats">
                  <ChartLineIcon />
                  Statistik
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {activeTab === "exams" && <SortMenu {...sort} />}
              <Button onClick={() => openUploadModal(courseCode)}>
                <UploadIcon data-icon="inline-start" />
                Ladda upp
              </Button>
            </div>
          </div>

          <div
            key={activeTab}
            className="mt-5 animate-in duration-150 fade-in-0 slide-in-from-right-3"
          >
            {activeTab === "exams" ? (
              <CourseExamsTable
                courseCode={courseCode}
                exams={exams}
                sortBy={sort.sortBy}
                sortDirection={sort.sortDirection}
              />
            ) : (
              <Suspense fallback={<CourseStatsSkeleton />}>
                <CourseStats exams={exams} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="font-bold">
      ·
    </span>
  );
}

function SortMenu({
  sortBy,
  sortDirection,
  setSortBy,
  setSortDirection,
}: {
  sortBy: ExamSortBy;
  sortDirection: ExamSortDirection;
  setSortBy: (value: ExamSortBy) => void;
  setSortDirection: (value: ExamSortDirection) => void;
}) {
  const DirectionIcon = sortDirection === "desc" ? ArrowDownIcon : ArrowUpIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Sortera tentor">
          <ArrowLeftRightIcon data-icon="inline-start" />
          {sortBy === "date" ? "Datum" : "Godkänd"}
          <DirectionIcon data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Sortera efter</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as ExamSortBy)}>
          <DropdownMenuRadioItem value="date">Datum</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="pass-rate">Godkänd</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Ordning</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortDirection}
          onValueChange={(v) => setSortDirection(v as ExamSortDirection)}
        >
          <DropdownMenuRadioItem value="desc">Fallande</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="asc">Stigande</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
