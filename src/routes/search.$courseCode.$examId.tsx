import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { DesktopExamView } from "@/components/exam/desktop-exam-view";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { courseExamsQuery, examDetailQuery } from "@/queries/exams";

const PdfRenderer = lazy(() =>
  import("@/components/pdf/pdf-renderer").then((m) => ({ default: m.PdfRenderer })),
);

/** Touch tablets use the full-width viewer in either orientation. */
const TOUCH_VIEWER_QUERY = "(max-width: 1023px), (pointer: coarse)";

export const Route = createFileRoute("/search/$courseCode/$examId")({
  params: {
    parse: ({ courseCode, examId }) => ({ courseCode: courseCode.toUpperCase(), examId }),
    stringify: ({ courseCode, examId }) => ({ courseCode, examId }),
  },
  loader: ({ context, params }) => {
    // Start both requests with the route chunk; the exam list is not awaited.
    void context.queryClient.prefetchQuery(courseExamsQuery(params.courseCode));
    return context.queryClient.ensureQueryData(examDetailQuery(params.examId));
  },
  pendingComponent: ExamPending,
  errorComponent: ExamError,
  component: ExamPage,
});

function ExamPending() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2">
      <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Laddar tenta...</p>
    </div>
  );
}

function ExamError({ reset }: { reset: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2">
      <p className="text-2xl text-foreground/80">Något gick fel!</p>
      <p className="text-sm text-muted-foreground">Ibland fungerar det att bara ladda om sidan :)</p>
      <Button variant="secondary" onClick={reset}>
        Ladda om
      </Button>
    </div>
  );
}

function ExamPage() {
  const { courseCode, examId } = Route.useParams();
  const { data: detail } = useQuery(examDetailQuery(examId));
  const { data: course } = useQuery(courseExamsQuery(courseCode));
  const isMobile = useMediaQuery(TOUCH_VIEWER_QUERY);

  const exam = detail?.exam;
  const solutionPdfUrl = detail?.solution?.pdf_url ?? null;

  useEffect(() => {
    if (exam) document.title = `${exam.course_code} - Tenta ${exam.exam_date} | LiU Tentor`;
  }, [exam]);

  if (!exam) return <ExamPending />;

  if (isMobile) {
    // Replaced by the mobile viewer (exam picker, facit sheet) in a later step.
    return (
      <div className="h-dvh">
        <Suspense fallback={<ExamPending />}>
          <PdfRenderer pdfUrl={exam.pdf_url} />
        </Suspense>
      </div>
    );
  }

  return (
    <DesktopExamView
      examId={examId}
      courseCode={courseCode}
      examPdfUrl={exam.pdf_url}
      examDate={exam.exam_date}
      solutionPdfUrl={solutionPdfUrl}
      exams={course?.exams ?? []}
    />
  );
}
