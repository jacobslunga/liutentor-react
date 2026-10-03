import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon, InboxIcon, LoaderCircleIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { CourseExamsTable } from "@/components/course/course-exams-table";
import { CourseSidebar } from "@/components/course/course-sidebar";
import { HeaderCourseSearch } from "@/components/search/course-search";
import { ExamUploadForm } from "@/components/upload/exam-upload-form";
import { computeCourseStats, passRateClass } from "@/lib/course-stats";
import { cn } from "@/lib/utils";
import { useSeo } from "@/hooks/use-seo";
import { courseExamsQuery } from "@/queries/exams";
import {
  useExamSortPreference,
  type ExamSortBy,
  type ExamSortDirection,
} from "@/stores/exam-sort";
import { useRecentSearches } from "@/stores/recent-searches";
import type { CourseExams } from "@/types/exam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CourseQuizPanel = lazy(
  () => import("@/components/quiz/course-quiz-panel"),
);

type CourseTab = "exams" | "quiz";

export const Route = createFileRoute("/_search/search/$courseCode")({
  params: {
    parse: ({ courseCode }) => ({ courseCode: courseCode.toUpperCase() }),
    stringify: ({ courseCode }) => ({ courseCode }),
  },

  validateSearch: (search: Record<string, unknown>): { tab?: "quiz" } =>
    search.tab === "quiz" ? { tab: search.tab } : {},
  component: CoursePage,
});

function CoursePage() {
  const { courseCode } = Route.useParams();
  const { data, isPending } = useQuery(courseExamsQuery(courseCode));
  const addRecentSearch = useRecentSearches((s) => s.add);

  const seo = useMemo(() => {
    const canonical = `https://liutentor.se/search/${courseCode}`;
    if (!data) {
      return {
        title: `${courseCode} – gamla tentor`,
        description: `Vi saknar gamla tentor för ${courseCode} vid Linköpings universitet.`,
        robots: "noindex, follow",
      };
    }
    const exams = data.exams;
    const solutions = exams.filter((exam) => exam.has_solution).length;
    const years = exams
      .map((exam) => exam.exam_date.slice(0, 4))
      .filter(Boolean)
      .sort();
    const yearText = years.length
      ? ` Tentor från ${years[0]}${years.at(-1) !== years[0] ? `–${years.at(-1)}` : ""}.`
      : "";
    const description = `${exams.length} gamla tentor${solutions ? ` varav ${solutions} med facit` : ""} för ${courseCode} – ${data.courseName} vid Linköpings universitet.${yearText}`;
    return {
      title: `${courseCode} tentor & facit – ${data.courseName}`,
      description,
      robots: exams.length ? "index, follow" : "noindex, follow",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Hem",
                item: "https://liutentor.se",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: courseCode,
                item: canonical,
              },
            ],
          },
          {
            "@type": "Course",
            name: `${courseCode} – ${data.courseName}`,
            courseCode,
            description,
            url: canonical,
            inLanguage: "sv",
            provider: {
              "@type": "CollegeOrUniversity",
              name: "Linköpings universitet",
              url: "https://liu.se",
            },
          },
          {
            "@type": "ItemList",
            name: `Gamla tentor för ${courseCode}`,
            numberOfItems: exams.length,
            itemListElement: exams.map((exam, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: `${courseCode} ${exam.exam_name}`,
              url: `${canonical}/${exam.id}`,
            })),
          },
        ],
      },
    };
  }, [courseCode, data]);

  useSeo({ ...seo, path: `/search/${courseCode}` });

  useEffect(() => {
    addRecentSearch(courseCode);
  }, [courseCode, addRecentSearch]);

  return (
    <div className="container mx-auto max-w-6xl px-4 pt-2 pb-8 md:px-8 md:py-8">
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
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-8 py-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <InboxIcon className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-medium">
          Vi saknar tentor för {courseCode}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Har du en gammal tenta eller ett facit? Ladda upp den här så blir
          nästa student som söker på {courseCode} hjälpt direkt.
        </p>
      </div>
      <ExamUploadForm initialCourseCode={courseCode} fixedCourseCode />
    </div>
  );
}

function CourseContent({
  courseCode,
  course,
}: {
  courseCode: string;
  course: CourseExams;
}) {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const activeTab: CourseTab = tab ?? "exams";
  const sort = useExamSortPreference("course-page");

  const exams = course.exams;
  const { overallPassRate } = useMemo(() => computeCourseStats(exams), [exams]);
  const avgPassRate =
    overallPassRate === undefined ? null : Math.round(overallPassRate);
  const examsWithSolutions = exams.filter((e) => e.has_solution).length;

  function setTab(value: CourseTab) {
    void navigate({
      search: value === "exams" ? {} : { tab: value },
      replace: true,
    });
  }

  return (
    <div className="flex w-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col flex-wrap items-start gap-y-2">
          <Badge variant="secondary">{courseCode}</Badge>
          <h1 className="text-2xl leading-tight font-semibold wrap-break-word md:text-4xl">
            {course.courseName}
          </h1>
        </div>

        <p className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground lg:hidden">
          <span>
            <span className="font-bold text-foreground">{exams.length}</span>{" "}
            tentor
          </span>
          <Dot />
          <span>
            <span className="font-bold text-foreground">
              {examsWithSolutions}
            </span>{" "}
            med facit
          </span>
          {avgPassRate !== null && (
            <>
              <Dot />
              <span>
                <span className={cn("font-bold", passRateClass(avgPassRate))}>
                  {avgPassRate}%
                </span>{" "}
                godkända i snitt
              </span>
            </>
          )}
        </p>
      </header>

      <div className="grid gap-x-8 gap-y-10 pt-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start [&_[role=tabpanel]]:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setTab(value as CourseTab)}
            className="contents"
          >
            <div
              className={cn(
                STICKY_BAR,
                "flex min-h-12 items-stretch shadow-[inset_0_-1px_var(--border)]",
              )}
            >
              <TabsList
                variant="line"
                aria-label="Kursvy"
                className="self-stretch p-0 group-data-horizontal/tabs:h-auto"
              >
                <TabsTrigger
                  value="exams"
                  className="h-full px-2 group-data-horizontal/tabs:after:bottom-0"
                >
                  Tentor
                  <Badge variant="secondary">{exams.length}</Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="quiz"
                  className="h-full px-2 group-data-horizontal/tabs:after:bottom-0"
                >
                  Quiz
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="exams" className="pt-4">
              <CourseExamsTable
                courseCode={courseCode}
                exams={exams}
                sortBy={sort.sortBy}
                sortDirection={sort.sortDirection}
              />
            </TabsContent>
            <TabsContent value="quiz" className="pt-4">
              {activeTab === "quiz" && (
                <Suspense fallback={null}>
                  <CourseQuizPanel courseCode={courseCode} exams={exams} />
                </Suspense>
              )}
            </TabsContent>
          </Tabs>
          <div
            className={cn(
              STICKY_BAR,
              "col-start-2 row-start-1 flex min-h-12 items-center shadow-[inset_0_-1px_var(--border)]",
            )}
          >
            {activeTab === "exams" && <SortMenu {...sort} />}
          </div>
        </div>

        <CourseSidebar exams={exams} />
      </div>
    </div>
  );
}

const STICKY_BAR = "sticky top-12 z-20 bg-background md:top-0";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Sortera tentor">
          {sortBy === "date" ? "Datum" : "Godkänd"}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>Sortera efter</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(value) => setSortBy(value as ExamSortBy)}
        >
          <DropdownMenuRadioItem value="date">Datum</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="pass-rate">
            Godkänd
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Ordning</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortDirection}
          onValueChange={(value) =>
            setSortDirection(value as ExamSortDirection)
          }
        >
          <DropdownMenuRadioItem value="desc">Fallande</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="asc">Stigande</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
