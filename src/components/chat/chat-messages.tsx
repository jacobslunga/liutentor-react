import {
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
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { useChatMarkdownReady } from "@/hooks/use-chat-markdown";
import {
  renderCachedChatMarkdown,
  renderChatMarkdown,
  selectionToMarkdown,
} from "@/lib/chat-markdown";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useChatStore,
  type ChatAttachment,
  type MessageSource,
} from "@/stores/chat";
import { SelectionPopover } from "./selection-popover";
import { SelectionQuote } from "./selection-quote";

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

const OPAQUE_SOURCE_HOSTS = ["vertexaisearch.cloud.google.com"];

function sourceLabel(source: MessageSource): string {
  try {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    return OPAQUE_SOURCE_HOSTS.includes(host) ? source.title || host : host;
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
  /** The scroll container that holds the transcript. */
  scrollRef: RefObject<HTMLElement | null>;
  className?: string;
  onReplyToSelection: (text: string) => void;
}

/**
 * The transcript. Subscribes only to the list of message ids, so a streamed
 * token re-renders the one row that owns the message, not the list.
 */
export function ChatMessages({
  ref,
  scrollRef,
  className,
  onReplyToSelection,
}: ChatMessagesProps) {
  const ids = useChatStore(useShallow((s) => s.messages.map((m) => m.id)));
  const mdReady = useChatMarkdownReady();
  const rootRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    anchor: number;
  } | null>(null);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;
      if (behavior === "auto") el.scrollTop = el.scrollHeight;
      else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    },
    [scrollRef],
  );

  const restoreScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = useChatStore.getState().savedScrollPosition;
    if (saved !== null) {
      el.scrollTop = saved;
    } else {
      scrollToBottom("auto");
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [scrollRef, scrollToBottom]);

  /**
   * Scrolls the newest question to the top and reserves room below it, so the
   * answer streams into view instead of pushing the question away.
   */
  const scrollUserMessageToTop = useCallback(() => {
    const root = rootRef.current;
    const parent = scrollRef.current;
    if (!root || !parent) return;
    const userRows = root.querySelectorAll<HTMLElement>('[data-role="user"]');
    if (userRows.length <= 1) {
      parent.scrollTop = 0;
      return;
    }
    const lastUser = userRows[userRows.length - 1];
    const gap = Number.parseFloat(getComputedStyle(root).rowGap) || 0;
    const reserve = Math.max(
      parent.clientHeight - lastUser.offsetHeight - gap - 40,
      0,
    );
    root.style.setProperty("--last-message-height", `${reserve}px`);
    lastUser.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollRef]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom,
      scrollUserMessageToTop,
      restoreScroll,
      persistScrollPosition: () => {
        const el = scrollRef.current;
        if (el) useChatStore.setState({ savedScrollPosition: el.scrollTop });
      },
    }),
    [scrollToBottom, scrollUserMessageToTop, restoreScroll, scrollRef],
  );

  // Position the transcript once markdown is up and rows have their real height.
  useEffect(() => {
    if (!mdReady) return;
    if (
      useChatStore.getState().isLoading &&
      useChatStore.getState().savedScrollPosition === null
    ) {
      requestAnimationFrame(scrollUserMessageToTop);
    } else {
      requestAnimationFrame(restoreScroll);
    }
  }, [mdReady, restoreScroll, scrollUserMessageToTop]);

  // The "Ask" popover hides when the selection clears or the transcript scrolls away.
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
        y: rect.top,
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
          "mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-1 px-2.5 [&>*:last-child]:min-h-(--last-message-height)",
          className,
        )}
        onMouseUp={onMouseUp}
        onClick={handleCodeCopy}
      >
        {ids.map((id, i) => (
          <MessageRow
            key={id}
            id={id}
            isLast={i === ids.length - 1}
            isRecent={i >= ids.length - 2}
          />
        ))}
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
  isLast,
  isRecent,
}: {
  id: string;
  isLast: boolean;
  /** The newest question and reply: streamed into and measured by scrolling. */
  isRecent: boolean;
}) {
  const message = useChatStore((s) => s.messages.find((m) => m.id === id));
  // A new assistant row mounts per turn, so each turn gets its own phrase.
  const [loadingPhrase] = useState(randomLoadingPhrase);
  const isStreaming = useChatStore((s) => isLast && s.isLoading);
  const rowRef = useRef<HTMLDivElement>(null);

  // Let the row lay out once at full size before it may be skipped offscreen,
  // so the browser remembers its real height instead of the placeholder.
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        rowRef.current?.setAttribute("data-measured", ""),
      );
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  if (!message) return null;

  if (message.role === "user") {
    return (
      <div
        ref={rowRef}
        data-role="user"
        data-recent={isRecent || undefined}
        className="chat-row flex min-w-0 scroll-mt-20 justify-end py-2"
      >
        <div className="flex max-w-[85%] min-w-0 flex-col items-start gap-2 rounded-2xl bg-muted px-4 py-3 shadow-xs sm:max-w-[75%]">
          {message.selectionContext && (
            <div className="line-clamp-3 border-l-2 border-foreground/30 pl-3 text-sm text-muted-foreground">
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
          {message.content && (
            <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
        </div>
      </div>
    );
  }

  const showStatus =
    !!message.status?.message || (!message.content && isStreaming);
  // The streaming reply changes every frame; finished replies come from the cache.
  const html = message.content
    ? isStreaming
      ? renderChatMarkdown(message.content)
      : renderCachedChatMarkdown(message.content)
    : "";

  return (
    <div
      ref={rowRef}
      data-role="assistant"
      data-recent={isRecent || undefined}
      className="chat-row w-full min-w-0 overflow-hidden pt-2 pb-8"
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
          className="chat-prose prose w-full prose-h1:font-semibold prose-h2:font-semibold prose-h3:font-medium prose-h4:font-medium prose-h5:font-medium prose-h6:font-medium max-w-none min-w-0 dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {!!message.sources?.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {message.sources.map((source) => (
            <Button
              key={source.url}
              asChild
              variant="outline"
              size="xs"
              className="max-w-56"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                title={source.title}
              >
                <GlobeIcon data-icon="inline-start" />
                <span className="truncate">{sourceLabel(source)}</span>
              </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
});

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

/** Delegated handler for the copy buttons inside rendered code blocks. */
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
