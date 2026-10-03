import { Link, useNavigate } from "@tanstack/react-router";
import { m, useTransform } from "framer-motion";
import {
  ArrowDownIcon,
  ChevronRightIcon,
  FolderIcon,
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
import { RouterLinkButton } from "@/components/shared/router-link";
import { useLearnChat } from "@/hooks/use-chat";
import { loadConversation } from "@/hooks/use-conversation-list";
import { normalizeClipboardFile } from "@/lib/chat-attachments";
import { cn } from "@/lib/utils";
import { useChatStore, useChatStoreApi, type Message } from "@/stores/chat";
import { useStudyCourse } from "@/queries/study-courses";
import {
  sidebarWidth,
  useLearnSidebar,
  useSidebarProgress,
} from "@/stores/learn-sidebar";
import { CourseHome } from "./course-home";
import { SIDEBAR_SHORTCUT } from "./sidebar-shortcut";
import { useSelectedModel } from "@/stores/settings";
import { IconButton } from "@/components/shared/icon-button";
import { Spinner } from "@/components/ui/spinner";

const PENDING_REPLY_ID = "pending-reply";

const MIN_LOAD_MS = 200;
const REPLY_POLL_MS = 2500;
const REPLY_POLL_ATTEMPTS = 60;

const REPLY_WINDOW_MS = 3 * 60 * 1000;

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

export function LearnChat({
  conversationId,
  courseId = null,
}: {
  conversationId: string | null;

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
  const sidebarProgress = useSidebarProgress(sidebar.inline && sidebar.open);
  const headerX = useTransform(
    () => sidebarProgress.get() * sidebarWidth.get(),
  );
  const bodyX = useTransform(
    () => (sidebarProgress.get() * sidebarWidth.get()) / 2,
  );
  const bodyWidth = useTransform(() => `calc(100% - ${sidebarWidth.get()}px)`);
  // The body is narrowed and centered, so stretch scrollers over the space to
  // its right to keep their scrollbar at the window edge.
  const gutter = useTransform(
    () => ((1 - sidebarProgress.get()) * sidebarWidth.get()) / 2,
  );
  const negativeGutter = useTransform(() => -gutter.get());
  const scrollerStyle = sidebar.inline
    ? { marginRight: negativeGutter, paddingRight: gutter }
    : undefined;

  const [selection, setSelection] = useState({ id: conversationId, text: "" });
  const selectionContext = selection.id === currentId ? selection.text : "";
  const setSelectionContext = useCallback(
    (text: string) =>
      setSelection({ id: chatStore.getState().currentConversationId, text }),
    [chatStore],
  );
  const [isOverDrop, setIsOverDrop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const [transcriptKey, setTranscriptKey] = useState(0);
  const [loadFailure, setLoadFailure] = useState<{
    id: string;
    reason: "missing" | "error";
  } | null>(null);

  const loadState =
    !conversationId || currentId === conversationId
      ? "ready"
      : loadFailure?.id === conversationId
        ? loadFailure.reason
        : "loading";

  const pinFrame = useRef<number | null>(null);
  const pinToBottom = useCallback(() => {
    if (pinFrame.current !== null) cancelAnimationFrame(pinFrame.current);
    pinFrame.current = requestAnimationFrame(() => {
      pinFrame.current = null;
      transcriptRef.current?.scrollToBottom("auto");
    });
  }, []);
  useEffect(
    () => () => {
      if (pinFrame.current !== null) cancelAnimationFrame(pinFrame.current);
    },
    [],
  );

  useEffect(() => {
    const state = chatStore.getState();
    if (
      state.currentConversationId === conversationId &&
      (conversationId !== null || state.currentCourseId === courseId)
    )
      return;

    chatStore.getState().clearChat();
    inputRef.current?.discardAttachments();
    if (!conversationId) {
      chatStore.setState({ currentCourseId: courseId });
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    let cancelled = false;

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

      if (!cancelled)
        chatStore.setState((s) => ({
          messages: s.messages.filter((m) => m.id !== PENDING_REPLY_ID),
        }));
    };

    Promise.all([
      loadConversation(conversationId),
      new Promise((r) => setTimeout(r, MIN_LOAD_MS)),
    ])
      .then(([conversation]) => {
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

          titleTypingStartedAt: performance.now(),
          titleTypesInSidebar: false,
          savedScrollPosition: null,
        });
        setTranscriptKey((n) => n + 1);
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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let depth = 0;

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

  function scrollToLatest() {
    transcriptRef.current?.scrollToBottom("smooth");
  }

  const updateScrollDistance = useCallback((distance: number) => {
    if (distance > 160) setShowScrollBottom(true);
    else if (distance < 80) setShowScrollBottom(false);
  }, []);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    updateScrollDistance(el.scrollHeight - (el.scrollTop + el.clientHeight));
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
        className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Spinner />
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
        <RouterLinkButton variant="outline" to="/chatt">
          Starta en ny chatt
        </RouterLinkButton>
      </div>
    );
  } else if (!hasMessages && courseId) {
    body = (
      <CourseHome
        courseId={courseId}
        input={input}
        scrollerStyle={scrollerStyle}
      />
    );
  } else if (!hasMessages) {
    body = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-1 pb-[12vh]">
        <div className="flex flex-col items-center gap-4 px-3 text-center">
          <ChatMascot className="size-14 shrink-0" />
          <div className="space-y-2">
            <h1 className="text-2xl font-medium sm:text-3xl">
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
        <m.div
          key={transcriptKey}
          ref={scrollRef}
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
          style={scrollerStyle}
          onScroll={onScroll}
        >
          <ChatMessages
            ref={transcriptRef}
            scrollRef={scrollRef}
            className="pt-16 pb-36 sm:pb-44"
            onReplyToSelection={replyToSelection}
            onScrollDistanceChange={updateScrollDistance}
          />
        </m.div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center bg-linear-to-t from-background to-transparent pt-10 pb-3 sm:pb-4">
          {showScrollBottom && (
            <IconButton
              variant="outline"
              className="pointer-events-auto mb-2.5 animate-in rounded-full shadow-md duration-150 fade-in-0"
              aria-label="Scrolla längst ned"
              onClick={scrollToLatest}
            >
              <ArrowDownIcon />
            </IconButton>
          )}
          {input}
        </div>
      </>
    );
  }

  return (
    <div
      ref={rootRef}
      className="learn-chat relative flex h-full w-full flex-col overflow-hidden bg-background"
    >
      {isOverDrop && <ChatDropOverlay />}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-none relative isolate flex h-14 items-center justify-between gap-2 px-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 bg-linear-to-b from-background via-background/90 to-transparent" />
          <m.div
            style={{ x: headerX }}
            className="flex min-w-0 items-center gap-1"
          >
            {!sidebar.open && (
              <HeaderButton
                icon={PanelLeftIcon}
                label="Öppna sidopanelen"
                shortcut={SIDEBAR_SHORTCUT}
                onClick={() => sidebar.setOpen(true)}
              />
            )}
            {loadState === "ready" && <TitlePill showCrumb={!courseId} />}
          </m.div>
          {(!sidebar.open || !sidebar.inline) && (
            <div className="pointer-events-auto flex shrink-0 items-center gap-1">
              <HeaderButton
                icon={SquarePenIcon}
                label="Ny chatt"
                onClick={() => {
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
              />
            </div>
          )}
        </div>
      </div>

      <m.div
        className="relative mx-auto flex min-h-0 flex-1 flex-col"
        style={{ x: bodyX, width: sidebar.inline ? bodyWidth : "100%" }}
      >
        {body}
      </m.div>
    </div>
  );
}

function HeaderButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <IconButton
      variant="ghost"
      className="pointer-events-auto"
      aria-label={label}
      shortcut={shortcut}
      onClick={onClick}
    >
      <Icon />
    </IconButton>
  );
}

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
        "pointer-events-auto flex min-w-0 items-center gap-0.5 py-1 pr-3.5",
        course ? "pl-1" : "pl-3.5",
      )}
    >
      {course && <CourseCrumb />}
      <ConversationTitle />
    </div>
  );
}

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
      <FolderIcon className="size-3.5 shrink-0 fill-brand text-brand" />
      <span className="truncate">{course.name}</span>
      <ChevronRightIcon className="size-3.5 shrink-0" />
    </Link>
  );
}
