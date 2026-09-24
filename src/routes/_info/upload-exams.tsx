import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/info/page-intro";
import { ExamUploadForm } from "@/components/upload/exam-upload-form";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_info/upload-exams")({
  component: UploadExamsPage,
});

function UploadExamsPage() {
  useDocumentTitle("Ladda upp tenta");

  return (
    <div>
      <PageIntro
        eyebrow="Bidra"
        title="Ladda upp tenta"
        lead="Hjälp andra studenter genom att dela gamla tentor och facit. Dra in PDF:erna, ange kurskod och skicka – vi sköter resten."
      />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-x-12 gap-y-8 py-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-16">
          <p className="text-sm font-medium text-muted-foreground lg:sticky lg:top-24 lg:self-start">Uppladdning</p>
          <div className="max-w-2xl">
            <ExamUploadForm />
          </div>
        </div>
      </div>
    </div>
  );
}
