import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, BookIcon, DownloadIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadFile } from "@/lib/download";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types/exam";
import { ExamPicker } from "./exam-picker";

const PdfRenderer = lazy(() =>
  import("@/components/pdf/pdf-renderer").then((m) => ({ default: m.PdfRenderer })),
);

/** Header height plus its bottom border. */
const HEADER_HEIGHT = 57;
const PDF_BOX_STYLE = { paddingTop: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))` };

interface MobileExamViewProps {
  exams: Exam[];
  examId: string;
  courseCode: string;
  examPdfUrl: string;
  examDate: string;
  solutionPdfUrl: string | null;
}

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function MobileHeader({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 border-b bg-background pt-[env(safe-area-inset-top,0px)]">
      <div className="flex h-14 shrink-0 items-center gap-3 px-3">{children}</div>
    </div>
  );
}

/**
 * Phones and touch tablets: one full-width PDF, a compact header, and the facit
 * as a full-screen layer that stays mounted so reopening it is instant.
 */
export function MobileExamView({
  exams,
  examId,
  courseCode,
  examPdfUrl,
  examDate,
  solutionPdfUrl,
}: MobileExamViewProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [solutionMounted, setSolutionMounted] = useState(false);

  // Keyboards on tablets: f toggles the facit, Esc closes it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSolution(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        e.key.toLowerCase() !== "f" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.repeat ||
        !solutionPdfUrl ||
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA"
      ) {
        return;
      }
      setSolutionMounted(true);
      setShowSolution((v) => !v);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [solutionPdfUrl]);

  function openSolution() {
    setSolutionMounted(true);
    setShowSolution(true);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <MobileHeader>
        <Button asChild variant="outline" size="icon" aria-label="Gå tillbaka">
          <Link to="/search/$courseCode" params={{ courseCode }}>
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">{courseCode}</p>
          <p className="truncate text-xs leading-tight text-muted-foreground">{examDate}</p>
        </div>
        {exams.length > 0 && (
          <div className="hidden shrink-0 md:block">
            <ExamPicker
              exams={exams}
              examId={examId}
              courseCode={courseCode}
              triggerVariant="outline"
              triggerSize="sm"
            >
              {examDate}
            </ExamPicker>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Ladda ned">
              <DownloadIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem
              onSelect={() => void downloadFile(examPdfUrl, `${courseCode}_${examDate}_EXAM.pdf`)}
            >
              <DownloadIcon />
              Ladda ned tenta
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!solutionPdfUrl}
              onSelect={() =>
                solutionPdfUrl &&
                void downloadFile(solutionPdfUrl, `${courseCode}_${examDate}_SOLUTION.pdf`)
              }
            >
              <DownloadIcon />
              Ladda ned facit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {solutionPdfUrl && (
          <Button variant="outline" size="sm" onClick={openSolution}>
            <BookIcon data-icon="inline-start" className="text-primary" />
            Facit
          </Button>
        )}
      </MobileHeader>

      <div className="h-full w-full overflow-hidden" style={PDF_BOX_STYLE}>
        <Suspense fallback={<Spinner />}>
          <PdfRenderer pdfUrl={examPdfUrl} />
        </Suspense>
      </div>

      {solutionPdfUrl && solutionMounted && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Facit"
          aria-hidden={!showSolution}
          inert={!showSolution}
          className={cn(
            "fixed inset-0 z-40 h-dvh w-screen overflow-hidden bg-background transition-[translate,opacity,scale] duration-200 ease-(--ease-spring)",
            showSolution ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-[0.99] opacity-0",
          )}
        >
          <MobileHeader>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm leading-tight font-semibold">Facit</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">
                {courseCode} - {examDate}
              </p>
            </div>
            <Button variant="outline" size="icon-sm" aria-label="Stäng" onClick={() => setShowSolution(false)}>
              <XIcon />
            </Button>
          </MobileHeader>
          <div className="h-full w-full overflow-hidden" style={PDF_BOX_STYLE}>
            <Suspense fallback={<Spinner />}>
              <PdfRenderer pdfUrl={solutionPdfUrl} />
            </Suspense>
          </div>
        </section>
      )}
    </div>
  );
}
