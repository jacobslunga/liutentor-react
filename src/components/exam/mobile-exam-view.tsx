import {
  ArrowLeftIcon,
  BookIcon,
  DownloadIcon,
  FileArchiveIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { RouterLinkButton } from "@/components/shared/router-link";
import { downloadBoth, downloadFile } from "@/lib/download";
import type { Exam } from "@/types/exam";
import { MobileChatOverlay } from "@/components/chat/mobile-chat-overlay";
import { examChatStore, useChatStore } from "@/stores/chat";
import { ExamPicker } from "./exam-picker";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PdfRenderer = lazy(() =>
  import("@/components/pdf/pdf-renderer").then((m) => ({
    default: m.PdfRenderer,
  })),
);

const HEADER_HEIGHT = 57;
const PDF_BOX_STYLE = {
  paddingTop: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
};

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
      <div className="flex h-14 shrink-0 items-center gap-3 px-3">
        {children}
      </div>
    </div>
  );
}

export function MobileExamView({
  exams,
  examId,
  courseCode,
  examPdfUrl,
  examDate,
  solutionPdfUrl,
}: MobileExamViewProps) {
  const chatOpen = useChatStore((s) => s.isOpen);
  const [chatMounted, setChatMounted] = useState(false);

  useEffect(() => {
    const chat = examChatStore.getState();
    chat.close();
    chat.clearChat();
    return () => {
      examChatStore.getState().close();
      examChatStore.getState().clearChat();
    };
  }, [examId]);

  const [showSolution, setShowSolution] = useState(false);
  const [solutionMounted, setSolutionMounted] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.key === "Escape") {
        const chat = examChatStore.getState();
        if (chat.isHistoryOpen) return;
        chat.close();
        setShowSolution(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.repeat ||
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }
      const chat = examChatStore.getState();
      const key = e.key.toLowerCase();
      if (key === "c" && !chat.isHistoryOpen) {
        e.preventDefault();
        setChatMounted(true);
        setShowSolution(false);
        chat.toggle();
      } else if (key === "f" && solutionPdfUrl && !chat.isOpen) {
        e.preventDefault();
        setSolutionMounted(true);
        setShowSolution((v) => !v);
      }
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
      <div className="h-full" inert={chatOpen || showSolution}>
        <MobileHeader>
          <RouterLinkButton
            variant="outline"
            to="/search/$courseCode"
            params={{ courseCode }}
            aria-label="Gå tillbaka"
            size="icon"
          >
            <ArrowLeftIcon />
          </RouterLinkButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-semibold">
              {courseCode}
            </p>
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {examDate}
            </p>
          </div>
          {exams.length > 0 && (
            <div className="hidden shrink-0 md:block">
              <ExamPicker
                exams={exams}
                examId={examId}
                courseCode={courseCode}
                triggerSize="sm"
              >
                {examDate}
              </ExamPicker>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                variant="outline"
                size="icon-sm"
                aria-label="Ladda ned"
              >
                <DownloadIcon />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() =>
                  void downloadFile(
                    examPdfUrl,
                    `${courseCode}_${examDate}_EXAM.pdf`,
                  )
                }
              >
                <DownloadIcon />
                Ladda ned tenta
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!solutionPdfUrl}
                onSelect={() =>
                  solutionPdfUrl &&
                  void downloadFile(
                    solutionPdfUrl,
                    `${courseCode}_${examDate}_SOLUTION.pdf`,
                  )
                }
              >
                <DownloadIcon />
                Ladda ned facit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!solutionPdfUrl}
                onSelect={() =>
                  solutionPdfUrl &&
                  downloadBoth(courseCode, examDate, examPdfUrl, solutionPdfUrl)
                }
              >
                <FileArchiveIcon />
                Ladda ned båda (.zip)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {solutionPdfUrl && (
            <Button variant="outline" size="sm" onClick={openSolution}>
              <BookIcon className="text-primary" />
              Facit
            </Button>
          )}
        </MobileHeader>

        <div className="h-full w-full overflow-hidden" style={PDF_BOX_STYLE}>
          <Suspense fallback={<Spinner />}>
            <PdfRenderer
              pdfUrl={examPdfUrl}
              mobileToolbarActions={
                <Button
                  size="lg"
                  onClick={() => {
                    setChatMounted(true);
                    examChatStore.getState().open();
                  }}
                >
                  Chatt
                </Button>
              }
            />
          </Suspense>
        </div>
      </div>

      {chatMounted && (
        <MobileChatOverlay
          open={chatOpen}
          examId={examId}
          courseCode={courseCode}
          examUrl={examPdfUrl}
          solutionUrl={solutionPdfUrl}
          onClose={() => examChatStore.getState().close()}
        />
      )}

      {solutionPdfUrl && solutionMounted && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Facit"
          aria-hidden={!showSolution}
          inert={!showSolution}
          data-state={showSolution ? "open" : "closed"}
          className="mobile-exam-overlay fixed inset-0 z-40 h-dvh w-screen overflow-hidden bg-background"
        >
          <MobileHeader>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm leading-tight font-semibold">
                Facit
              </p>
              <p className="truncate text-xs leading-tight text-muted-foreground">
                {courseCode} - {examDate}
              </p>
            </div>
            <IconButton
              variant="outline"
              size="icon-sm"
              aria-label="Stäng"
              onClick={() => setShowSolution(false)}
            >
              <XIcon />
            </IconButton>
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
