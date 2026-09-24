import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import {
  DocumentContent,
  DocumentManagerPluginPackage,
} from "@embedpdf/plugin-document-manager/react";
import {
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react";
import {
  RenderLayer,
  RenderPluginPackage,
} from "@embedpdf/plugin-render/react";
import { Rotate, RotatePluginPackage } from "@embedpdf/plugin-rotate/react";
import type { PageLayout } from "@embedpdf/plugin-scroll";
import { Scroller, ScrollPluginPackage } from "@embedpdf/plugin-scroll/react";
import {
  SelectionLayer,
  SelectionPluginPackage,
} from "@embedpdf/plugin-selection/react";
import {
  Viewport,
  ViewportPluginPackage,
} from "@embedpdf/plugin-viewport/react";
import {
  ZoomGestureWrapper,
  ZoomMode,
  ZoomPluginPackage,
} from "@embedpdf/plugin-zoom/react";
import { LoaderCircleIcon } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useLatest } from "@/hooks/use-latest";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { usePageLoadingTask } from "@/stores/page-loading";
import { PdfCopyShortcut } from "./pdf-copy-shortcut";
import { PdfPageControls, PdfZoomControls } from "./pdf-page-controls";
import { PdfScrollbars } from "./pdf-scrollbars";
import { PdfSelectionMenu } from "./pdf-selection-menu";
import { PdfWheelZoom } from "./pdf-wheel-zoom";
import { createLiveZoomStore, LiveZoomContext } from "./pdf-zoom-context";
import { PdfZoomController } from "./pdf-zoom-controller";
import "./pdf.css";

export type PdfLayoutMode = "exam-only" | "exam-with-facit" | "default";

export interface PdfRendererProps {
  pdfUrl: string;
  layoutMode?: PdfLayoutMode;
  explainEnabled?: boolean;
  onExplain?: (text: string) => void;
}

const MAX_EXAM_ONLY_PAGE_WIDTH = 980;
const MOBILE_QUERY = "(max-width: 1023px)";

function Spinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Holds the page loading bar while `pending`; renders nothing. */
function PageLoadingTask({ pending }: { pending: boolean }) {
  usePageLoadingTask(pending);
  return null;
}

/**
 * A self-contained PDF viewer: its own PDFium engine, plugin registry, zoom
 * and scroll state. Memoized with primitive props so parents re-rendering
 * (drags, chat streaming) never reach the pages.
 */
export const PdfRenderer = memo(function PdfRenderer({
  pdfUrl,
  layoutMode = "default",
  explainEnabled = false,
  onExplain,
}: PdfRendererProps) {
  const { engine, isLoading } = usePdfiumEngine();
  usePageLoadingTask(isLoading || !engine);

  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [liveZoom] = useState(createLiveZoomStore);
  const maxPageWidth =
    layoutMode === "exam-only" ? MAX_EXAM_ONLY_PAGE_WIDTH : null;

  // Only a new URL may rebuild the registry; anything else would reload the document.
  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: pdfUrl }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(RotatePluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitWidth,
      }),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(SelectionPluginPackage, {
        toleranceFactor: 2.0,
        minSelectionDragDistance: 5,
      }),
    ],
    [pdfUrl],
  );

  // Keep page rendering stable across parent re-renders that pass a new callback.
  const onExplainRef = useLatest(onExplain);
  const explain = useCallback(
    (text: string) => onExplainRef.current?.(text),
    [onExplainRef],
  );

  return (
    <div className="group/pdf relative isolate h-full w-full overflow-hidden bg-secondary">
      {isLoading || !engine ? (
        <Spinner />
      ) : (
        <LiveZoomContext.Provider value={liveZoom}>
          <EmbedPDF engine={engine} plugins={plugins}>
            {({ activeDocumentId }) =>
              activeDocumentId && (
                <PdfDocument
                  documentId={activeDocumentId}
                  isMobile={isMobile}
                  maxPageWidth={maxPageWidth}
                  onExplain={explainEnabled ? explain : undefined}
                />
              )
            }
          </EmbedPDF>
        </LiveZoomContext.Provider>
      )}
    </div>
  );
});

interface PdfDocumentProps {
  documentId: string;
  isMobile: boolean;
  maxPageWidth: number | null;
  onExplain?: (text: string) => void;
}

function PdfDocument({
  documentId,
  isMobile,
  maxPageWidth,
  onExplain,
}: PdfDocumentProps) {
  const renderPage = useCallback(
    (page: PageLayout) => (
      <PdfPage
        documentId={documentId}
        page={page}
        isMobile={isMobile}
        onExplain={onExplain}
      />
    ),
    [documentId, isMobile, onExplain],
  );

  return (
    <>
      <PdfZoomController documentId={documentId} maxPageWidth={maxPageWidth}>
        {!isMobile && (
          <PdfPageControls
            documentId={documentId}
            className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2"
          />
        )}
      </PdfZoomController>

      {isMobile && (
        <PdfZoomControls
          documentId={documentId}
          className="absolute bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 z-30 -translate-x-1/2"
        />
      )}

      <DocumentContent documentId={documentId}>
        {({ isLoaded }) => (
          <>
            <PageLoadingTask pending={!isLoaded} />
            {!isLoaded ? (
              <Spinner />
            ) : (
              <div className="h-full w-full">
                <Viewport
                  documentId={documentId}
                  className="pdf-viewport bg-background"
                >
                  <PdfScrollbars />
                  <PdfCopyShortcut />
                  {isMobile ? (
                    <Scroller documentId={documentId} renderPage={renderPage} />
                  ) : (
                    <>
                      <PdfWheelZoom />
                      <ZoomGestureWrapper
                        documentId={documentId}
                        enablePinch={false}
                        enableWheel
                        className="pdf-zoom-gesture"
                      >
                        <Scroller
                          documentId={documentId}
                          renderPage={renderPage}
                        />
                      </ZoomGestureWrapper>
                    </>
                  )}
                </Viewport>
              </div>
            )}
          </>
        )}
      </DocumentContent>
    </>
  );
}

interface PdfPageProps {
  documentId: string;
  page: PageLayout;
  isMobile: boolean;
  onExplain?: (text: string) => void;
}

function PdfPage({ documentId, page, isMobile, onExplain }: PdfPageProps) {
  return (
    <div
      className="relative mx-auto my-4"
      style={{ width: page.rotatedWidth, height: page.rotatedHeight }}
    >
      <PagePointerProvider
        documentId={documentId}
        pageIndex={page.pageIndex}
        className={cn(isMobile && "pdf-mobile-pointer")}
      >
        <Rotate
          documentId={documentId}
          pageIndex={page.pageIndex}
          // Dark: the inverted page is screen-blended onto the dark background.
          className="bg-background"
          style={{ width: page.width, height: page.height }}
        >
          <div className="pdf-render-surface absolute inset-0 z-0">
            <RenderLayer documentId={documentId} pageIndex={page.pageIndex} />
          </div>
          <div className="pdf-selection-surface absolute inset-0 z-10">
            <SelectionLayer
              documentId={documentId}
              pageIndex={page.pageIndex}
              selectionMenu={
                onExplain
                  ? ({ menuWrapperProps, placement }) => (
                      <div {...menuWrapperProps}>
                        <PdfSelectionMenu
                          documentId={documentId}
                          above={placement.suggestTop}
                          onExplain={onExplain}
                        />
                      </div>
                    )
                  : undefined
              }
            />
          </div>
        </Rotate>
      </PagePointerProvider>
    </div>
  );
}
