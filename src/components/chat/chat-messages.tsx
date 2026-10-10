import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  LoaderCircleIcon,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useChatMarkdownReady } from "@/hooks/use-chat-markdown";
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from "@tanstack/react-virtual";
import {
  renderCachedChatMarkdown,
  renderChatMarkdown,
  selectionToMarkdown,
} from "@/lib/chat-markdown";
import { splitCourseMentions } from "@/lib/course-mentions";
import { courseFileUrl } from "@/lib/study-courses";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/shared/icon-button";
import {
  useChatStore,
  useChatStoreApi,
  type ChatAttachment,
  type ChatScrollPosition,
  type MessageSource,
} from "@/stores/chat";
import { SelectionPopover } from "./selection-popover";
import { SelectionQuote } from "./selection-quote";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/shared/router-link";
import { Spinner } from "@/components/ui/spinner";

const LOADING_PHRASES = [
  "Baljar...",
  "Går till Terra...",
  "Kollar Lisam...",
  "Letar grupprum i B-huset...",
  "Köar i Kårallen...",
  "Räknar om HP...",
  "Cyklar över Campus Valla...",
  "Hämtar kaffe i Key...",
  "Frågar någon i märkesbacken...",
  "Letar facit i tenta-P...",
  "Tar en omväg via Zenit...",
];

type WebSource = Extract<MessageSource, { url: string }>;

function sourceLabel(source: WebSource): string {
  try {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return source.title || source.url;
  }
}

export interface ChatTranscriptApi {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollUserMessageToTop: () => void;
  restoreScroll: () => void;
  persistScrollPosition: () => void;
}

interface ChatMessagesProps {
  ref?: Ref<ChatTranscriptApi>;
  scrollRef: RefObject<HTMLElement | null>;
  className?: string;
  onReplyToSelection: (text: string) => void;
  onScrollDistanceChange?: (distance: number) => void;
  keepRowsMounted?: boolean;
}

const allRows = (range: Range) =>
  Array.from({ length: range.count }, (_, index) => index);

export function ChatMessages({
  ref,
  scrollRef,
  className,
  onReplyToSelection,
  onScrollDistanceChange,
  keepRowsMounted = false,
}: ChatMessagesProps) {
  const chatStore = useChatStoreApi();
  const ids = useChatStore(useShallow((s) => s.messages.map((m) => m.id)));
  const [initialPosition] = useState(
    () => chatStore.getState().savedScrollPosition,
  );
  const [reserve, setReserve] = useState(initialPosition?.reserve ?? 0);
  const reserveRef = useRef(reserve);
  const [paddingTop, setPaddingTop] = useState(64);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const mdReady = useChatMarkdownReady();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const pendingScroll = useRef<(() => void) | null>(null);
  const initialized = useRef(false);
  const latestPosition = useRef<ChatScrollPosition | null>(initialPosition);
  const getItemKey = useCallback((index: number) => ids[index], [ids]);
  // TanStack Virtual owns mutable measurement state and must not be compiler-memoized.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => scrollElement,
    getItemKey,
    estimateSize: () => 240,
    overscan: 5,
    // Medium Learn conversations stay measured instead of rebuilding rich
    // markdown and correcting estimated heights as the reader scrolls.
    rangeExtractor: keepRowsMounted ? allRows : defaultRangeExtractor,
    gap: 4,
    scrollMargin: paddingTop,
    scrollPaddingStart: 80,
    initialOffset: initialPosition?.offset ?? 0,
    initialMeasurementsCache: initialPosition?.measurements,
    anchorTo: "start",
    followOnAppend: false,
    // Resizing rich markdown can trigger another resize during measurement.
    useAnimationFrameWithResizeObserver: true,
  });
  useEffect(() => {
    // The parent's DOM ref is attached after the child's layout effects.
    const frame = requestAnimationFrame(() =>
      setScrollElement(scrollRef.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [scrollRef]);
  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    anchor: number;
  } | null>(null);
  const firstMessageId = ids[0];
  const previousFirstMessageId = useRef(firstMessageId);
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const measureRow = useCallback(
    (node: HTMLDivElement | null) => virtualizer.measureElement(node),
    // Changing the ref remeasures rows that stayed mounted after a cache reset.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [virtualizer, measurementVersion],
  );
  useLayoutEffect(() => {
    if (previousFirstMessageId.current === firstMessageId) return;
    previousFirstMessageId.current = firstMessageId;
    initialized.current = false;
    latestPosition.current = null;
    pendingScroll.current = null;
    reserveRef.current = 0;
    setReserve(0);
    setPopover(null);
    if (scrollAnimationRef.current !== null) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
  }, [firstMessageId]);

  // Keep correcting an explicit destination while newly mounted rows are measured.
  // The operation ends once settled; later streaming never follows the bottom.
  const scrollToTarget = useCallback(
    (target: () => number | null, behavior: ScrollBehavior) => {
      const el = scrollRef.current;
      if (!el) return;
      if (scrollAnimationRef.current !== null) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      const startTop = el.scrollTop;
      const startedAt = performance.now();
      const duration =
        behavior === "smooth" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 400
          : 0;
      let settled = 0;
      let previous: number | null = null;
      const animate = (now: number) => {
        const destination = target();
        if (destination === null) {
          scrollAnimationRef.current = null;
          return;
        }
        const progress = duration
          ? Math.min((now - startedAt) / duration, 1)
          : 1;
        const eased = 1 - (1 - progress) ** 3;
        const next = Math.max(
          0,
          Math.min(destination, el.scrollHeight - el.clientHeight),
        );
        virtualizer.scrollToOffset(startTop + (next - startTop) * eased);
        settled =
          progress === 1 &&
          previous !== null &&
          Math.abs(previous - next) < 1 &&
          Math.abs(el.scrollTop - next) < 1
            ? settled + 1
            : 0;
        previous = next;
        if (settled < 3 && now - startedAt < 1200) {
          scrollAnimationRef.current = requestAnimationFrame(animate);
        } else {
          scrollAnimationRef.current = null;
        }
      };
      scrollAnimationRef.current = requestAnimationFrame(animate);
    },
    [scrollRef, virtualizer],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const run = () =>
        scrollToTarget(() => {
          const el = scrollRef.current;
          return el ? el.scrollHeight - el.clientHeight : null;
        }, behavior);
      if (!rootRef.current || !virtualizer.scrollElement)
        pendingScroll.current = run;
      else run();
    },
    [scrollRef, scrollToTarget, virtualizer],
  );

  useEffect(
    () => () => {
      if (scrollAnimationRef.current !== null)
        cancelAnimationFrame(scrollAnimationRef.current);
    },
    [],
  );

  const restoreScroll = useCallback(
    (saved = chatStore.getState().savedScrollPosition) => {
      if (
        !saved ||
        saved.firstMessageId !== chatStore.getState().messages[0]?.id
      ) {
        scrollToBottom("auto");
        return;
      }
      reserveRef.current = saved.reserve;
      setReserve(saved.reserve);
      const run = () => {
        const index = chatStore
          .getState()
          .messages.findIndex((m) => m.id === saved.anchorId);
        virtualizer.scrollToOffset(saved.offset);
        scrollToTarget(() => {
          if (index < 0) return saved.offset;
          const item = virtualizer
            .getVirtualItems()
            .find((item) => item.index === index);
          if (item) return item.start + saved.anchorOffset;
          const offset = virtualizer.getOffsetForIndex(index, "start");
          return offset ? offset[0] + 80 + saved.anchorOffset : saved.offset;
        }, "auto");
      };
      if (!rootRef.current || !virtualizer.scrollElement)
        pendingScroll.current = run;
      else run();
    },
    [chatStore, scrollToBottom, scrollToTarget, virtualizer],
  );

  const scrollUserMessageToTop = useCallback(() => {
    const run = () => {
      const parent = scrollRef.current;
      if (!parent) return;
      const messages = chatStore.getState().messages;
      const index = messages.findLastIndex((m) => m.role === "user");
      if (index < 0) return;
      const firstQuestion =
        messages.filter((m) => m.role === "user").length === 1;
      reserveRef.current = firstQuestion
        ? 0
        : Math.max(parent.clientHeight - 120, 0);
      setReserve(reserveRef.current);
      scrollToTarget(() => {
        if (firstQuestion) return 0;
        const item = virtualizer
          .getVirtualItems()
          .find((item) => item.index === index);
        if (item) {
          const nextReserve = Math.max(
            parent.clientHeight - item.size - 4 - 40,
            0,
          );
          if (nextReserve !== reserveRef.current) {
            reserveRef.current = nextReserve;
            setReserve(nextReserve);
          }
          return item.start - 80;
        }
        return virtualizer.getOffsetForIndex(index, "start")?.[0] ?? null;
      }, "smooth");
    };
    if (!rootRef.current || !virtualizer.scrollElement)
      pendingScroll.current = run;
    else run();
  }, [chatStore, scrollRef, scrollToTarget, virtualizer]);

  const captureScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    const messages = chatStore.getState().messages;
    if (!el || !el.clientHeight || !rootRef.current || !messages.length) return;
    const items = virtualizer.getVirtualItems();
    const anchor =
      items.find((item) => item.end > el.scrollTop) ?? items.at(-1);
    // A conversation replacement can unmount the old transcript in the same commit.
    if (!items.length || items[0].key !== messages[items[0].index]?.id) return;
    const saved: ChatScrollPosition = {
      offset: el.scrollTop,
      anchorId: anchor ? (messages[anchor.index]?.id ?? null) : null,
      anchorOffset: anchor ? el.scrollTop - anchor.start : 0,
      measurements: virtualizer.takeSnapshot(),
      width: rootRef.current.clientWidth,
      reserve: reserveRef.current,
      firstMessageId: messages[0].id,
    };
    latestPosition.current = saved;
  }, [chatStore, scrollRef, virtualizer]);

  const saveCapturedPosition = useCallback(() => {
    const saved = latestPosition.current;
    if (
      saved &&
      saved.firstMessageId === chatStore.getState().messages[0]?.id
    ) {
      chatStore.setState({ savedScrollPosition: saved });
    }
  }, [chatStore]);

  const persistScrollPosition = useCallback(() => {
    captureScrollPosition();
    saveCapturedPosition();
  }, [captureScrollPosition, saveCapturedPosition]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom,
      scrollUserMessageToTop,
      restoreScroll,
      persistScrollPosition,
    }),
    [
      scrollToBottom,
      scrollUserMessageToTop,
      restoreScroll,
      persistScrollPosition,
    ],
  );

  useEffect(() => {
    if (!mdReady || !scrollElement || !firstMessageId || initialized.current)
      return;
    initialized.current = true;
    if (pendingScroll.current) {
      const run = pendingScroll.current;
      pendingScroll.current = null;
      run();
      return;
    }
    if (
      chatStore.getState().isLoading &&
      chatStore.getState().savedScrollPosition === null
    ) {
      requestAnimationFrame(scrollUserMessageToTop);
    } else {
      requestAnimationFrame(() => restoreScroll(initialPosition));
    }
  }, [
    chatStore,
    firstMessageId,
    initialPosition,
    mdReady,
    restoreScroll,
    scrollElement,
    scrollUserMessageToTop,
  ]);

  useLayoutEffect(() => {
    if (!mdReady || !scrollElement) return;
    const root = rootRef.current;
    const el = scrollRef.current;
    if (!root || !el) return;
    el.style.overflowAnchor = "none";
    let width = root.clientWidth;
    if (initialPosition && initialPosition.width !== width) {
      virtualizer.measure();
      setMeasurementVersion((version) => version + 1);
    }
    const observer = new ResizeObserver(() => {
      setPaddingTop(Number.parseFloat(getComputedStyle(root).paddingTop) || 0);
      if (width === root.clientWidth) return;
      const items = virtualizer.getVirtualItems();
      const anchor = items.find((item) => item.end > el.scrollTop);
      const relative = anchor ? el.scrollTop - anchor.start : 0;
      width = root.clientWidth;
      virtualizer.measure();
      setMeasurementVersion((version) => version + 1);
      if (anchor)
        scrollToTarget(() => {
          const item = virtualizer
            .getVirtualItems()
            .find((item) => item.key === anchor.key);
          if (item) return item.start + relative;
          const offset = virtualizer.getOffsetForIndex(anchor.index, "start");
          return offset ? offset[0] + 80 + relative : null;
        }, "auto");
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [
    initialPosition,
    mdReady,
    scrollElement,
    scrollRef,
    scrollToTarget,
    virtualizer,
  ]);

  // Use the last committed snapshot: descendant removal can clamp scrollTop
  // before a parent's unmount cleanup runs.
  useLayoutEffect(() => () => saveCapturedPosition(), [saveCapturedPosition]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (mdReady && el) {
      captureScrollPosition();
      onScrollDistanceChange?.(
        el.scrollHeight - el.clientHeight - el.scrollTop,
      );
    }
  });

  useEffect(() => {
    const el = scrollRef.current;
    const stop = () => {
      pendingScroll.current = null;
      if (scrollAnimationRef.current !== null)
        cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    };
    el?.addEventListener("wheel", stop, { passive: true });
    el?.addEventListener("touchstart", stop, { passive: true });
    el?.addEventListener("pointerdown", stop);
    el?.addEventListener("scroll", captureScrollPosition, { passive: true });
    return () => {
      el?.removeEventListener("wheel", stop);
      el?.removeEventListener("touchstart", stop);
      el?.removeEventListener("pointerdown", stop);
      el?.removeEventListener("scroll", captureScrollPosition);
    };
  }, [captureScrollPosition, scrollRef]);

  useEffect(() => {
    if (!popover) return;
    const onSelectionChange = () => {
      if (!window.getSelection()?.toString().trim()) setPopover(null);
    };
    const el = scrollRef.current;
    const onScroll = () => {
      if (el && Math.abs(el.scrollTop - popover.anchor) > 80) setPopover(null);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      el?.removeEventListener("scroll", onScroll);
    };
  }, [popover, scrollRef]);

  function onMouseUp() {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection?.toString().trim() || !selection.rangeCount)
        return setPopover(null);
      const range = selection.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const el =
        node.nodeType === Node.TEXT_NODE
          ? node.parentElement
          : (node as Element);
      if (!el?.closest('[data-role="assistant"]')) return setPopover(null);
      const rect = range.getBoundingClientRect();
      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.bottom,
        anchor: scrollRef.current?.scrollTop ?? 0,
      });
    }, 0);
  }

  function reply() {
    const selection = window.getSelection();
    const text = selection ? selectionToMarkdown(selection) : "";
    if (!text) return;
    selection?.removeAllRanges();
    setPopover(null);
    onReplyToSelection(text);
  }

  if (!mdReady) {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-1 items-center justify-center gap-2 px-4 py-20 text-sm text-muted-foreground",
          className,
        )}
      >
        <LoaderCircleIcon className="size-5 animate-spin" />
        <span>Laddar konversation...</span>
      </div>
    );
  }

  return (
    <>
      <div
        ref={rootRef}
        className={cn(
          "chat-column mx-auto w-full min-w-0 shrink-0 px-4 sm:px-5",
          className,
        )}
        onMouseUp={onMouseUp}
        onClick={handleCodeCopy}
      >
        <div
          className="relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
          <div
            className="absolute inset-x-0 top-0 flex flex-col gap-1"
            style={{
              transform: `translateY(${(virtualizer.getVirtualItems()[0]?.start ?? paddingTop) - paddingTop}px)`,
            }}
          >
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                data-index={item.index}
                ref={measureRow}
                style={{
                  minHeight:
                    item.index === ids.length - 1 ? reserve : undefined,
                }}
              >
                <MessageRow
                  id={ids[item.index]}
                  index={item.index}
                  isLast={item.index === ids.length - 1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {popover && (
        <SelectionPopover x={popover.x} y={popover.y} onReply={reply} />
      )}
    </>
  );
}

function randomLoadingPhrase() {
  return LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
}

const MessageRow = memo(function MessageRow({
  id,
  index,
  isLast,
}: {
  id: string;
  index: number;
  isLast: boolean;
}) {
  const message = useChatStore((s) => {
    const atIndex = s.messages[index];
    return atIndex?.id === id ? atIndex : s.messages.find((m) => m.id === id);
  });
  const [loadingPhrase] = useState(randomLoadingPhrase);
  const isStreaming = useChatStore((s) => isLast && s.isLoading);

  if (!message) return null;

  if (message.role === "user") {
    return (
      <div
        data-role="user"
        className="group/message chat-row flex min-w-0 scroll-mt-20 flex-col items-end pt-2"
      >
        <div className="flex max-w-[85%] min-w-0 flex-col items-start gap-2 rounded-xl bg-brand/10 px-4 py-1.5 shadow-xs sm:max-w-[75%]">
          {message.selectionContext && (
            <div className="line-clamp-3 border-l-2 border-foreground/30 pl-3 font-chat text-sm text-muted-foreground">
              "<SelectionQuote text={message.selectionContext} />"
            </div>
          )}
          {!!message.attachments?.length && (
            <div className="flex flex-wrap gap-1.5">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} attachment={a} />
              ))}
            </div>
          )}
          {message.content && <CollapsibleUserText text={message.content} />}
        </div>
        <div className="mt-0.5 -mr-1.5 h-7">
          {message.content && (
            <CopyButton text={message.content} className={ACTION_REVEAL} />
          )}
        </div>
      </div>
    );
  }

  const showStatus =
    !!message.status?.message || (!message.content && isStreaming);
  const html = message.content
    ? isStreaming
      ? renderChatMarkdown(message.content)
      : renderCachedChatMarkdown(message.content)
    : "";

  return (
    <div
      data-role="assistant"
      className="group/message chat-row w-full min-w-0 overflow-hidden pt-2 pb-4"
    >
      {showStatus && (
        <div className="mb-2 flex h-6 items-center gap-2">
          <LoaderCircleIcon className="variable-spin size-4 text-muted-foreground" />
          <span className="shimmer-text text-sm">
            {message.status?.message || loadingPhrase}
          </span>
        </div>
      )}
      {html && (
        <div
          className="chat-prose prose prose-sm w-full max-w-none min-w-0 font-chat sm:prose-base dark:prose-invert prose-headings:font-medium prose-h1:text-xl sm:prose-h1:text-2xl prose-h2:text-lg sm:prose-h2:text-xl prose-h3:text-base sm:prose-h3:text-lg prose-h4:text-sm sm:prose-h4:text-base prose-h5:text-sm prose-h6:text-xs prose-strong:font-medium prose-li:marker:text-foreground"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {message.content && !isStreaming && (
        <div className="mt-1 -ml-1.5">
          <CopyButton text={message.content} className={ACTION_REVEAL} />
        </div>
      )}
      {!!message.sources?.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {message.sources.map((source) =>
            source.type === "file" ? (
              <FileSourceChip key={source.fileId} source={source} />
            ) : (
              <ButtonLink
                variant="outline"
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                title={source.title}
                size="sm"
                className="max-w-56"
              >
                <GlobeIcon />
                <span className="truncate">{sourceLabel(source)}</span>
              </ButtonLink>
            ),
          )}
        </div>
      )}
    </div>
  );
});

function FileSourceChip({
  source,
}: {
  source: Extract<MessageSource, { type: "file" }>;
}) {
  const [opening, setOpening] = useState(false);

  async function open() {
    if (opening) return;
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const url = await courseFileUrl(source.fileId);
      if (!url) {
        tab?.close();
        toast.error("Filen finns inte längre i kursen.");
        return;
      }
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      tab?.close();
      toast.error("Kunde inte öppna filen.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="max-w-56"
      title={source.title}
      onClick={() => void open()}
      disabled={opening}
    >
      {opening && <Spinner />}
      <FileTextIcon />
      <span className="truncate">{source.title}</span>
    </Button>
  );
}

const ACTION_REVEAL =
  "opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 group-focus-within/message:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100";

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <IconButton
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground", className)}
      aria-label={copied ? "Kopierat" : "Kopiera"}
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 1500);
          },
          () => toast.error("Kunde inte kopiera."),
        );
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </IconButton>
  );
}

function CollapsibleUserText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const collapsible = overflowing || expanded;

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <p
        ref={textRef}
        className={cn(
          "overflow-hidden text-sm leading-relaxed whitespace-pre-wrap text-foreground sm:text-[0.9375rem]",
          // Collapse after 6 rendered rows.
          !expanded && "line-clamp-6",
        )}
      >
        <UserText text={text} />
      </p>
      {collapsible && (
        <button
          type="button"
          className="-ml-0.5 flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          aria-label={expanded ? "Visa mindre" : "Visa mer"}
          aria-expanded={expanded}
          onClick={() => {
            const el = textRef.current;
            const from = el?.offsetHeight ?? 0;
            flushSync(() => setExpanded((v) => !v));
            if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches)
              return;
            el.animate(
              [{ height: `${from}px` }, { height: `${el.offsetHeight}px` }],
              { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
            );
          }}
        >
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform duration-150",
              expanded && "rotate-180",
            )}
          />
        </button>
      )}
    </div>
  );
}

function UserText({ text }: { text: string }) {
  return splitCourseMentions(text).map((part, i) =>
    part.type === "text" ? (
      part.text
    ) : (
      <span
        key={i}
        className="rounded-md bg-background px-1 py-px font-medium text-foreground"
      >
        @{part.code}
      </span>
    ),
  );
}

function AttachmentChip({ attachment }: { attachment: ChatAttachment }) {
  return (
    <div
      className={cn(
        "flex max-w-full min-w-0 animate-in items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs duration-200 fade-in-0 slide-in-from-bottom-1",
        !attachment.active && "text-muted-foreground opacity-70",
      )}
    >
      {attachment.mediaType === "application/pdf" ? (
        <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
      ) : attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt=""
          className="size-14 shrink-0 rounded-md object-cover"
        />
      ) : (
        <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="max-w-28 truncate" title={attachment.name}>
        {attachment.name}
      </span>
      <span className="shrink-0 text-muted-foreground">
        {formatFileSize(attachment.size)}
      </span>
    </div>
  );
}

const copyTimers = new WeakMap<HTMLElement, number>();

function handleCodeCopy(e: React.MouseEvent) {
  const btn = (e.target as HTMLElement).closest<HTMLElement>(".code-copy");
  if (!btn) return;
  const code =
    btn.closest(".code-block")?.querySelector("pre")?.textContent ?? "";
  if (!code) return;
  navigator.clipboard.writeText(code).catch(() => {});

  const label = btn.querySelector(".code-copy-label");
  if (label) label.textContent = "Kopierad";
  btn.classList.add("copied");
  const existing = copyTimers.get(btn);
  if (existing) window.clearTimeout(existing);
  copyTimers.set(
    btn,
    window.setTimeout(() => {
      if (label) label.textContent = "Kopiera";
      btn.classList.remove("copied");
      copyTimers.delete(btn);
    }, 1500),
  );
}
