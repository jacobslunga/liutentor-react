import { Link } from "@tanstack/react-router";
import { LoaderCircleIcon, MousePointer2Icon, UploadIcon } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { ExamHeader } from "@/components/exam/exam-header";
import { FacitEdge } from "@/components/exam/facit-edge";
import { ResizeHandle } from "@/components/exam/resize-handle";
import { Button } from "@/components/ui/button";
import { useLatest } from "@/hooks/use-latest";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";
import { useExamViewStore } from "@/stores/exam-view";
import { useSettingsStore } from "@/stores/settings";
import type { Exam } from "@/types/exam";

const PdfRenderer = lazy(() =>
  import("@/components/pdf/pdf-renderer").then((m) => ({ default: m.PdfRenderer })),
);
const ChatWindow = lazy(() => import("@/components/chat/chat-window"));

const SPLIT_MIN = 20;
const SPLIT_MAX = 80;
const SPLIT_KEY_STEP = 2;
const OVERLAY_MIN = 300;
const OVERLAY_MAX_SHARE = 0.85;
/** Room for the floating header above the first page. */
const HEADER_INSET = 64;
/** The header is summoned from the very top in focus mode, and leaves below this. */
const HEADER_ACTIVE_Y = 96;
const FOCUS_SUMMON_Y = 8;

const clampSplit = (percent: number) => Math.min(Math.max(percent, SPLIT_MIN), SPLIT_MAX);

function PaneSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

interface DesktopExamViewProps {
  examId: string;
  courseCode: string;
  examPdfUrl: string;
  examDate: string;
  solutionPdfUrl: string | null;
  exams: Exam[];
}

/**
 * Desktop exam viewer: floating header, exam + facit split (or exam only with
 * a facit overlay) and the chat overlay.
 *
 * Re-render budget: this component renders on layout/visibility changes only.
 * Split and overlay widths live in refs and CSS variables on the root, the
 * facit glow tracks the pointer on its own, and the PDF renderers are memoized.
 */
export function DesktopExamView({
  examId,
  courseCode,
  examPdfUrl,
  examDate,
  solutionPdfUrl,
  exams,
}: DesktopExamViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const splitRowRef = useRef<HTMLDivElement>(null);
  const split = useRef(55);
  const overlayWidth = useRef(Math.round(window.innerWidth / 2));
  const isOverlayResizing = useRef(false);

  const layoutMode = useSettingsStore((s) => s.layoutMode);
  const showExplain = useSettingsStore((s) => s.showExplainPopover);
  const blurFacitUntilHover = useSettingsStore((s) => s.blurFacitUntilHover);
  const isFacitVisible = useExamViewStore((s) => s.isFacitVisible);
  const isHeaderMounted = useExamViewStore((s) => s.isHeaderMounted);
  const chatHasBeenOpened = useExamViewStore((s) => s.chatHasBeenOpened);
  const chatOpen = useChatStore((s) => s.isOpen);

  const isExamOnly = layoutMode === "exam-only";
  const hasFacit = !!solutionPdfUrl;

  // Widths are written straight to CSS variables; never through React state.
  const applySplit = useCallback((percent: number) => {
    split.current = clampSplit(percent);
    rootRef.current?.style.setProperty("--exam-split", `${split.current}%`);
  }, []);
  const applyOverlayWidth = useCallback((width: number) => {
    overlayWidth.current = Math.round(
      Math.max(OVERLAY_MIN, Math.min(width, window.innerWidth * OVERLAY_MAX_SHARE)),
    );
    rootRef.current?.style.setProperty("--exam-overlay-width", `${overlayWidth.current}px`);
  }, []);

  useLayoutEffect(() => {
    applySplit(split.current);
    applyOverlayWidth(overlayWidth.current);
  }, [applySplit, applyOverlayWidth]);

  const explain = useCallback((text: string) => {
    useChatStore.getState().askAboutSelection("Förklara", text);
  }, []);

  // A new exam starts with fresh view state and an empty chat.
  useEffect(() => {
    useExamViewStore.getState().reset(useSettingsStore.getState().blurFacitUntilHover);
    const chat = useChatStore.getState();
    chat.close();
    chat.clearChat();
    return () => {
      const chat = useChatStore.getState();
      chat.close();
      chat.clearChat();
    };
  }, [examId]);

  useEffect(() => {
    useExamViewStore.getState().setSolutionBlurred(blurFacitUntilHover);
  }, [blurFacitUntilHover]);

  // Opening the chat hides the facit overlay and mounts the chat for good.
  useEffect(() => {
    if (!chatOpen) return;
    const view = useExamViewStore.getState();
    view.setFacitVisible(false, false);
    view.markChatOpened();
  }, [chatOpen]);

  const latest = useLatest({ isExamOnly, hasFacit });

  // Pointer: header reveal in focus mode, and the facit overlay near the right edge.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const view = useExamViewStore.getState();

      if (view.focusMode) {
        // Hysteresis: summoned from the very top, dismissed well below it.
        if (!view.isHeaderMounted && e.clientY < FOCUS_SUMMON_Y) view.setHeaderMounted(true);
        else if (view.isHeaderMounted && e.clientY > HEADER_ACTIVE_Y) view.setHeaderMounted(false);
      }

      const { isExamOnly, hasFacit } = latest.current;
      if (
        !isExamOnly ||
        !hasFacit ||
        view.isFacitManual ||
        isOverlayResizing.current ||
        useChatStore.getState().isOpen
      ) {
        return;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const safeZone = h * 0.25;
      const inSafeZone = e.clientY < safeZone || e.clientY > h - safeZone;

      if (inSafeZone && !view.isFacitVisible) return;
      if (!view.isFacitVisible && e.clientY < 80) return;
      if (view.isFacitVisible && e.clientX >= w - overlayWidth.current - 40) return;

      const next = e.clientX > w * 0.92 && !inSafeZone;
      if (next !== view.isFacitVisible) view.setFacitVisible(next);
    }

    function onLeave() {
      const view = useExamViewStore.getState();
      if (!view.isFacitManual && view.isFacitVisible) view.setFacitVisible(false);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [latest]);

  // Keyboard: Esc closes history/facit/chat, c chat, f focus, e facit/blur, arrows split.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      const chat = useChatStore.getState();
      const view = useExamViewStore.getState();

      if (e.key === "Escape") {
        if (chat.isOpen && chat.isHistoryOpen) {
          e.preventDefault();
          chat.setHistoryOpen(false);
          return;
        }
        view.setFacitVisible(false, false);
        chat.close();
        return;
      }

      if (chat.isOpen) return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        return;
      }
      // Let browser/OS shortcuts through (cmd/ctrl+F, alt combos, ...).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const { isExamOnly } = latest.current;
      const key = e.key.toLowerCase();

      if (!isExamOnly && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        applySplit(split.current + (e.key === "ArrowRight" ? SPLIT_KEY_STEP : -SPLIT_KEY_STEP));
      } else if (key === "c") {
        e.preventDefault();
        chat.open();
      } else if (key === "f") {
        e.preventDefault();
        view.toggleFocusMode();
      } else if (key === "e") {
        e.preventDefault();
        if (isExamOnly) {
          const next = !view.isFacitVisible;
          view.setFacitVisible(next, next);
        } else {
          view.setSolutionBlurred(!view.solutionBlurred);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [latest, applySplit]);

  const splitRowWidth = useRef({ left: 0, width: 1 });

  return (
    <div ref={rootRef} className="relative flex h-dvh w-full flex-col overflow-hidden bg-background">
      {isHeaderMounted && (
        <div className="absolute inset-x-0 top-0 z-30 animate-in duration-200 fade-in-0 slide-in-from-top-2">
          <ExamHeader
            exams={exams}
            examId={examId}
            courseCode={courseCode}
            examPdfUrl={examPdfUrl}
            examDate={examDate}
            solutionPdfUrl={solutionPdfUrl}
          />
        </div>
      )}

      <div ref={splitRowRef} className="relative flex h-full min-h-0 flex-1 flex-row overflow-hidden">
        <div
          className="relative isolate h-full min-w-0 overflow-hidden bg-background"
          style={{ width: isExamOnly ? "100%" : "var(--exam-split)" }}
        >
          <Suspense fallback={<PaneSpinner />}>
            <PdfRenderer
              pdfUrl={examPdfUrl}
              layoutMode={layoutMode}
              topInset={HEADER_INSET}
              explainEnabled={showExplain}
              onExplain={explain}
            />
          </Suspense>
          {isExamOnly && hasFacit && !isFacitVisible && !chatOpen && <FacitEdge />}
        </div>

        {!isExamOnly && (
          <>
            <div className="relative z-20 w-0 shrink-0">
              <ResizeHandle
                onResizeStart={() => {
                  // The row can't change size mid-drag, so measure it once.
                  const rect = splitRowRef.current?.getBoundingClientRect();
                  splitRowWidth.current = { left: rect?.left ?? 0, width: rect?.width || window.innerWidth };
                }}
                onResize={(x) => {
                  const { left, width } = splitRowWidth.current;
                  applySplit(((x - left) / width) * 100);
                }}
              />
            </div>
            <div className="relative isolate h-full min-w-0 flex-1 overflow-hidden bg-background">
              {solutionPdfUrl ? (
                <SolutionPane
                  pdfUrl={solutionPdfUrl}
                  explainEnabled={showExplain}
                  onExplain={explain}
                />
              ) : (
                <NoSolution />
              )}
            </div>
          </>
        )}
      </div>

      {isExamOnly && solutionPdfUrl && (
        <SideOverlay
          visible={isFacitVisible && !chatOpen}
          zIndex="z-30"
          onResize={applyOverlayWidth}
          onResizeStart={() => (isOverlayResizing.current = true)}
          onResizeEnd={() => (isOverlayResizing.current = false)}
        >
          <Suspense fallback={<PaneSpinner />}>
            <PdfRenderer
              pdfUrl={solutionPdfUrl}
              layoutMode="exam-only"
              explainEnabled={showExplain}
              onExplain={explain}
            />
          </Suspense>
        </SideOverlay>
      )}

      {chatHasBeenOpened && (
        <SideOverlay
          visible={chatOpen}
          zIndex="z-40"
          onResize={applyOverlayWidth}
          onResizeStart={() => (isOverlayResizing.current = true)}
          onResizeEnd={() => (isOverlayResizing.current = false)}
        >
          <Suspense fallback={<PaneSpinner />}>
            <ChatWindow
              key={examId}
              examId={examId}
              courseCode={courseCode}
              examUrl={examPdfUrl}
              solutionUrl={solutionPdfUrl}
              onClose={() => useChatStore.getState().close()}
            />
          </Suspense>
        </SideOverlay>
      )}
    </div>
  );
}

/**
 * A right-hand overlay that stays mounted while hidden (like v-show), so its
 * PDF or chat keeps state. Width comes from the shared CSS variable.
 */
function SideOverlay({
  visible,
  zIndex,
  children,
  onResize,
  onResizeStart,
  onResizeEnd,
}: {
  visible: boolean;
  zIndex: string;
  children: ReactNode;
  onResize: (width: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
}) {
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed right-0 bottom-0 flex h-dvh border-l bg-background shadow-xl transition-[translate,opacity,filter] duration-200 ease-(--ease-spring) dark:shadow-none",
        zIndex,
        // `starting:` animates the first open too, when the overlay mounts already visible.
        visible
          ? "translate-x-0 opacity-100 starting:translate-x-full starting:opacity-0"
          : "pointer-events-none translate-x-full opacity-0 blur-sm",
      )}
      style={{ width: "var(--exam-overlay-width)" }}
    >
      <div className="relative z-10 w-0 shrink-0">
        <ResizeHandle
          onResize={(x) => onResize(window.innerWidth - x)}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
        />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/** The facit half of the split, blurred until hovered when that setting is on. */
function SolutionPane({
  pdfUrl,
  explainEnabled,
  onExplain,
}: {
  pdfUrl: string;
  explainEnabled: boolean;
  onExplain: (text: string) => void;
}) {
  const blurred = useExamViewStore((s) => s.solutionBlurred);
  const setBlurred = useExamViewStore((s) => s.setSolutionBlurred);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setBlurred(false)}
      onMouseLeave={() => setBlurred(useSettingsStore.getState().blurFacitUntilHover)}
    >
      <Suspense fallback={<PaneSpinner />}>
        <PdfRenderer
          pdfUrl={pdfUrl}
          layoutMode="exam-with-facit"
          topInset={HEADER_INSET}
          explainEnabled={explainEnabled}
          onExplain={onExplain}
        />
      </Suspense>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/30 backdrop-blur-sm transition-opacity duration-200",
          blurred ? "opacity-100" : "opacity-0",
        )}
      >
        <p className="text-sm font-medium text-muted-foreground">Håll muspekaren för att visa facit</p>
        <MousePointer2Icon className="size-6 text-muted-foreground" />
      </div>
    </div>
  );
}

function NoSolution() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="group relative w-full max-w-sm">
        <div className="rounded-md border-2 border-dashed px-8 py-10 transition-colors group-hover:border-primary/30">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-md bg-muted transition-colors group-hover:bg-primary/10">
              <UploadIcon className="size-6 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground/80">Inget facit tillgängligt</p>
              <p className="mt-1 max-w-55 text-xs leading-relaxed text-muted-foreground">
                Hjälp andra studenter genom att ladda upp facit till denna tenta.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/upload-exams">
                <UploadIcon data-icon="inline-start" />
                Ladda upp
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
