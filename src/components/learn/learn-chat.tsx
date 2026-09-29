import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ChevronRightIcon,
  FolderIcon,
  LoaderCircleIcon,
  PanelLeftIcon,
  SquarePenIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatDropOverlay } from "@/components/chat/chat-drop-overlay";
import { ChatInput, type ChatInputApi } from "@/components/chat/chat-input";
import { ChatMascot } from "@/components/chat/chat-mascot";
import {
  ChatMessages,
  type ChatTranscriptApi,
} from "@/components/chat/chat-messages";
import { ConversationTitle } from "@/components/chat/conversation-title";
import "@/components/chat/chat.css";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLearnChat } from "@/hooks/use-chat";
import { loadConversation } from "@/hooks/use-conversation-list";
import { normalizeClipboardFile } from "@/lib/chat-attachments";
import { cn } from "@/lib/utils";
import { useChatStore, useChatStoreApi, type Message } from "@/stores/chat";
import { useStudyCourse } from "@/queries/study-courses";
import { useLearnSidebar } from "@/stores/learn-sidebar";
import { CourseHome } from "./course-home";
import { SidebarShortcutKbd } from "./sidebar-shortcut";
import { useSelectedModel } from "@/stores/settings";

const PENDING_REPLY_ID = "pending-reply";
/** Matches the transcript's fade-in (`duration-500`). */
const REVEAL_MS = 500;
const REPLY_POLL_MS = 2500;
const REPLY_POLL_ATTEMPTS = 60;
/** A question newer than this with no answer is still being answered. */
const REPLY_WINDOW_MS = 3 * 60 * 1000;

/** The last saved turn is a recent question: its answer is on its way. */
function isAwaitingReply(messages: Message[]): boolean {
  const last = messages.at(-1);
  if (last?.role !== "user" || !last.createdAt) return false;
  return Date.now() - new Date(last.createdAt).getTime() < REPLY_WINDOW_MS;
}

const pendingReply = (): Message => ({
  id: PENDING_REPLY_ID,
  role: "assistant",
  content: "",
  status: { step: "pending", message: "Svaret skrivs fortfarande..." },
});

/**
 * One conversation in the learning chat, or a new one when `conversationId`
 * is null. The first turn of a new chat creates its id, and the URL follows.
 */
export function LearnChat({
  conversationId,
  courseId = null,
}: {
  conversationId: string | null;
  /** On a study course's page (no conversation yet): start a chat in it. */
  courseId?: string | null;
}) {
  const chatStore = useChatStoreApi();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputApi>(null);
  const transcriptRef = useRef<ChatTranscriptApi>(null);

  const hasMessages = useChatStore((s) => s.messages.length > 0);
  const currentId = useChatStore((s) => s.currentConversationId);
  const inCourse = useChatStore((s) => !!s.currentCourseId) || !!courseId;
  const { selectedModelId } = useSelectedModel();
  const { send, cancelGeneration } = useLearnChat();
  const sidebar = useLearnSidebar();

  // A quote belongs to the conversation it was taken from.
  const [selection, setSelection] = useState({ id: conversationId, text: "" });
  const selectionContext = selection.id === currentId ? selection.text : "";
  const setSelectionContext = useCallback(
    (text: string) =>
      setSelection({ id: chatStore.getState().currentConversationId, text }),
    [chatStore],
  );
  const [isOverDrop, setIsOverDrop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  // Bumped each time a saved conversation is opened, so its transcript fades
  // in. The fade class is dropped as soon as it has run (or after a fallback
  // delay): a fade left on the transcript could freeze it half-transparent.
  const [revealCount, setRevealCount] = useState(0);
  const [revealing, setRevealing] = useState(false);
  useEffect(() => {
    if (!revealing) return;
    const timer = window.setTimeout(() => setRevealing(false), REVEAL_MS + 300);
    return () => window.clearTimeout(timer);
  }, [revealing, revealCount]);
  const [loadFailure, setLoadFailure] = useState<{
    id: string;
    reason: "missing" | "error";
  } | null>(null);
  // Loading until the store holds the conversation the URL names.
  const loadState =
    !conversationId || currentId === conversationId
      ? "ready"
      : loadFailure?.id === conversationId
        ? loadFailure.reason
        : "loading";

  // Opening a saved conversation lands at its end.
  const pinToBottom = useCallback(() => {
    for (const delay of [0, 30, 80, 160, 300]) {
      setTimeout(() => transcriptRef.current?.scrollToBottom("auto"), delay);
    }
  }, []);

  // Bring the store in line with the URL: load the conversation it names, or
  // start empty (in the course whose page this is). The chat the store already
  // holds (e.g. one that just got its id from its first turn) is left alone.
  useEffect(() => {
    const state = chatStore.getState();
    if (
      state.currentConversationId === conversationId &&
      (conversationId !== null || state.currentCourseId === courseId)
    )
      return;
    // A reply still streaming for the chat we leave keeps going and is saved.
    chatStore.getState().clearChat();
    inputRef.current?.discardAttachments();
    if (!conversationId) {
      chatStore.setState({ currentCourseId: courseId });
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    let cancelled = false;

    // The answer is still being written (the chat was left mid-reply): check
    // back until it is saved, then show it.
    const pollForReply = async () => {
      for (let attempt = 0; attempt < REPLY_POLL_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, REPLY_POLL_MS));
        if (cancelled) return;
        const next = await loadConversation(conversationId).catch(() => null);
        if (cancelled) return;
        if (next && !isAwaitingReply(next.messages)) {
          chatStore.setState({ messages: next.messages });
          pinToBottom();
          return;
        }
      }
      // Gave up: drop the placeholder rather than spin forever.
      if (!cancelled)
        chatStore.setState((s) => ({
          messages: s.messages.filter((m) => m.id !== PENDING_REPLY_ID),
        }));
    };

    loadConversation(conversationId)
      .then((conversation) => {
        if (cancelled) return;
        if (!conversation) {
          setLoadFailure({ id: conversationId, reason: "missing" });
          return;
        }
        const pending = isAwaitingReply(conversation.messages);
        chatStore.setState({
          messages: pending
            ? [...conversation.messages, pendingReply()]
            : conversation.messages,
          currentConversationId: conversationId,
          currentCourseId: conversation.courseId,
          currentConversationTitle: conversation.title,
          isConversationTitleReady: true,
          // The header types the title in each time a chat opens; the sidebar
          // row already shows it.
          titleTypingStartedAt: performance.now(),
          titleTypesInSidebar: false,
          savedScrollPosition: null,
        });
        setRevealCount((n) => n + 1);
        setRevealing(true);
        pinToBottom();
        if (pending) void pollForReply();
      })
      .catch(() => {
        if (!cancelled) setLoadFailure({ id: conversationId, reason: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [chatStore, conversationId, courseId, pinToBottom]);

  const onCourseHomeRef = useRef(false);
  useEffect(() => {
    onCourseHomeRef.current = !!courseId && !hasMessages;
  });

  // A new chat's first turn creates its id; move the URL onto it.
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  });
  useEffect(
    () =>
      chatStore.subscribe((s, prev) => {
        if (
          conversationIdRef.current === null &&
          !prev.currentConversationId &&
          s.currentConversationId
        ) {
          void navigate({
            to: "/chatt/$conversationId",
            params: { conversationId: s.currentConversationId },
            replace: true,
          });
        }
      }),
    [chatStore, navigate],
  );

  const submit = useCallback(
    async (
      text: string,
      context?: string,
      attachments = inputRef.current?.getAttachments() ?? [],
    ) => {
      requestAnimationFrame(() =>
        transcriptRef.current?.scrollUserMessageToTop(),
      );
      await send(text, attachments, {
        modelId: selectedModelId,
        selectionContext: context,
      });
    },
    [send, selectedModelId],
  );

  function handleSend() {
    const input = inputRef.current;
    const text = input?.getText() ?? "";
    const attachments = input?.getAttachments() ?? [];
    if ((!text.trim() && !attachments.length) || chatStore.getState().isLoading)
      return;
    const context = selectionContext || undefined;
    input?.setText("");
    input?.clearAttachments();
    setSelectionContext("");
    void submit(text, context, attachments);
  }

  function handleCancel() {
    const cancelled = cancelGeneration();
    if (!cancelled) return;
    inputRef.current?.setText(cancelled.content);
    inputRef.current?.setAttachments(cancelled.attachments);
    inputRef.current?.focus();
  }

  const replyToSelection = useCallback(
    (text: string) => {
      setSelectionContext(text);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [setSelectionContext],
  );

  // Files: drop anywhere on the chat, or paste.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let depth = 0;
    // On a course's page, dropped files are course material, not attachments.
    const hasFiles = (e: DragEvent) =>
      !onCourseHomeRef.current && !!e.dataTransfer?.types.includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setIsOverDrop(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setIsOverDrop(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setIsOverDrop(false);
      inputRef.current?.addFiles(Array.from(e.dataTransfer?.files ?? []));
    };
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.length) return;
      e.preventDefault();
      inputRef.current?.addFiles(files.map(normalizeClipboardFile));
    };
    root.addEventListener("dragenter", onEnter);
    root.addEventListener("dragover", onOver);
    root.addEventListener("dragleave", onLeave);
    root.addEventListener("drop", onDrop);
    document.addEventListener("paste", onPaste, true);
    return () => {
      root.removeEventListener("dragenter", onEnter);
      root.removeEventListener("dragover", onOver);
      root.removeEventListener("dragleave", onLeave);
      root.removeEventListener("drop", onDrop);
      document.removeEventListener("paste", onPaste, true);
    };
  }, []);

  // While we smooth-scroll to the bottom, the scroll passes back through the
  // "far from bottom" zone; ignore it until we arrive (or give up after a second).
  const autoScrolling = useRef(false);
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function scrollToLatest() {
    setShowScrollBottom(false);
    autoScrolling.current = true;
    clearTimeout(autoScrollTimer.current);
    autoScrollTimer.current = setTimeout(
      () => (autoScrolling.current = false),
      1000,
    );
    transcriptRef.current?.scrollToBottom("smooth");
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (autoScrolling.current) {
      if (distance < 80) {
        autoScrolling.current = false;
        clearTimeout(autoScrollTimer.current);
      }
      return;
    }
    // Hysteresis keeps the button from flickering near the threshold.
    if (distance > 160) setShowScrollBottom(true);
    else if (distance < 80) setShowScrollBottom(false);
  }

  const input = (
    <ChatInput
      ref={inputRef}
      className="pointer-events-auto"
      placeholder={
        inCourse
          ? "Fråga om kursen och dess material"
          : "Fråga något, eller skriv @ för att välja kurs"
      }
      courseMentions
      wide
      showDisclaimer={false}
      selectionContext={selectionContext}
      onSend={handleSend}
      onCancel={handleCancel}
      onClearSelectionContext={() => setSelectionContext("")}
    />
  );

  let body;
  if (loadState === "loading") {
    body = (
      <div
        role="status"
        className="flex flex-1 animate-in items-center justify-center gap-2 text-sm text-muted-foreground fill-mode-both fade-in-0"
        // Quick loads go straight to the fade-in without a spinner flash.
        style={{ animationDelay: "300ms" }}
      >
        <LoaderCircleIcon className="size-5 animate-spin" />
        <span>Laddar konversation...</span>
      </div>
    );
  } else if (loadState === "missing" || loadState === "error") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {loadState === "missing"
            ? "Chatten finns inte, eller så har den raderats."
            : "Kunde inte öppna chatten."}
        </p>
        <Button asChild variant="outline">
          <Link to="/chatt">Starta en ny chatt</Link>
        </Button>
      </div>
    );
  } else if (!hasMessages && courseId) {
    body = <CourseHome courseId={courseId} input={input} />;
  } else if (!hasMessages) {
    body = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-1 pb-[12vh]">
        <div className="flex flex-col items-center gap-4 px-3 text-center">
          <ChatMascot className="size-14 shrink-0" />
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-medium sm:text-3xl">
              Vad vill du lära dig idag?
            </h1>
          </div>
        </div>
        <div className="w-full">{input}</div>
      </div>
    );
  } else {
    body = (
      <>
        <div
          key={revealCount}
          ref={scrollRef}
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain",
            revealing &&
              "animate-in duration-500 ease-out fade-in-0 slide-in-from-bottom-2 motion-reduce:slide-in-from-bottom-0",
          )}
          onScroll={onScroll}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setRevealing(false);
          }}
        >
          <ChatMessages
            ref={transcriptRef}
            scrollRef={scrollRef}
            className="max-w-3xl pt-16 pb-36 sm:pb-44"
            onReplyToSelection={replyToSelection}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center bg-linear-to-t from-background to-transparent pt-10 pb-3 sm:pb-4">
          {showScrollBottom && (
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-auto mb-2.5 animate-in rounded-full shadow-md duration-150 fade-in-0"
              aria-label="Rulla till senaste"
              onClick={scrollToLatest}
            >
              <ArrowDownIcon />
            </Button>
          )}
          {input}
        </div>
      </>
    );
  }

  return (
    <div
      ref={rootRef}
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-background"
    >
      {isOverDrop && <ChatDropOverlay />}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-none relative isolate flex h-14 items-center justify-between gap-2 px-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 bg-linear-to-b from-background via-background/90 to-transparent" />
          <div className="flex min-w-0 items-center gap-1">
            {!sidebar.open && (
              <HeaderButton
                label="Öppna sidopanelen"
                shortcut={<SidebarShortcutKbd />}
                onClick={() => sidebar.setOpen(true)}
              >
                <PanelLeftIcon />
              </HeaderButton>
            )}
            {loadState === "ready" && <TitlePill showCrumb={!courseId} />}
          </div>
          {(!sidebar.open || !sidebar.inline) && (
            <div className="pointer-events-auto flex shrink-0 items-center gap-1">
              <HeaderButton
                label="Ny chatt"
                onClick={() => {
                  // A new chat stays in the course the open one belongs to.
                  const course = chatStore.getState().currentCourseId;
                  void navigate(
                    course
                      ? {
                          to: "/chatt/kurs/$courseId",
                          params: { courseId: course },
                        }
                      : { to: "/chatt" },
                  );
                }}
              >
                <SquarePenIcon />
              </HeaderButton>
            </div>
          )}
        </div>
      </div>

      {body}
    </div>
  );
}

function HeaderButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="pointer-events-auto"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        {shortcut}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The course crumb and conversation title on a frosted pill, so they stay
 * readable over the transcript scrolling underneath.
 */
function TitlePill({ showCrumb }: { showCrumb: boolean }) {
  const hasTitle = useChatStore(
    (s) => s.isConversationTitleReady && !!s.currentConversationTitle,
  );
  const courseId = useChatStore((s) => s.currentCourseId);
  const { course } = useStudyCourse(showCrumb ? courseId : null);
  if (!hasTitle && !course) return null;
  return (
    <div
      className={cn(
        "pointer-events-auto flex min-w-0 animate-in items-center gap-0.5 py-1 pr-3.5 duration-200 fade-in-0",
        course ? "pl-1" : "pl-3.5",
      )}
    >
      {course && <CourseCrumb />}
      <ConversationTitle />
    </div>
  );
}

/** "Kursnamn ›" before the title of a chat that belongs to a study course. */
function CourseCrumb() {
  const courseId = useChatStore((s) => s.currentCourseId);
  const { course } = useStudyCourse(courseId);
  if (!course) return null;
  return (
    <Link
      to="/chatt/kurs/$courseId"
      params={{ courseId: course.id }}
      className="pointer-events-auto flex max-w-[min(12rem,30vw)] shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
    >
      <FolderIcon className="size-3.5 shrink-0 fill-primary text-primary" />
      <span className="truncate">{course.name}</span>
      <ChevronRightIcon className="size-3.5 shrink-0" />
    </Link>
  );
}
