import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import { examDetailQuery } from "@/queries/exams";

const PdfRenderer = lazy(() =>
  import("@/components/pdf/pdf-renderer").then((m) => ({ default: m.PdfRenderer })),
);

export const Route = createFileRoute("/search/$courseCode/$examId")({
  component: ExamPage,
});

// Temporary viewer until the exam page (header, facit split, chat) lands.
function ExamPage() {
  const { examId } = Route.useParams();
  const { data } = useQuery(examDetailQuery(examId));

  return (
    <div className="flex h-dvh w-full">
      <div className="h-full min-w-0 flex-1">
        {data ? (
          <Suspense fallback={null}>
            <PdfRenderer
              pdfUrl={data.exam.pdf_url}
              layoutMode="exam-with-facit"
              explainEnabled
              onExplain={(text) => console.info("explain", text)}
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center">
            <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {data?.solution && (
        <div className="h-full min-w-0 flex-1 border-l">
          <Suspense fallback={null}>
            <PdfRenderer pdfUrl={data.solution.pdf_url} layoutMode="exam-with-facit" />
          </Suspense>
        </div>
      )}
    </div>
  );
}
