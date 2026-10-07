import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, HistoryIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useExamChat } from "@/hooks/use-chat";
import { normalizeClipboardFile } from "@/lib/chat-attachments";
import {
  useChatStore,
  useChatStoreApi,
  type PendingSelection,
} from "@/stores/chat";
import { useSelectedModel } from "@/stores/settings";
import { ChatDropOverlay } from "./chat-drop-overlay";
import { ChatHistoryDialog } from "./chat-history-dialog";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";
import { ChatInput, type ChatInputApi } from "./chat-input";
import { ChatMascot } from "./chat-mascot";
import { ChatMessages, type ChatTranscriptApi } from "./chat-messages";
import { ConversationTitle } from "./conversation-title";
import "./chat.css";
import { IconButton } from "@/components/shared/icon-button";

export interface ChatWindowProps {
  examId: string;
  courseCode: string;
  examUrl: string;
  solutionUrl: string | null;
  onClose: () => void;
}

export default function ChatWindow({
  examId,
  courseCode,
  examUrl,
  solutionUrl,
  onClose,
}: ChatWindowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputApi>(null);
  const transcriptRef = useRef<ChatTranscriptApi>(null);

  const chatStore = useChatStoreApi();
  const hasMessages = useChatStore((s) => s.messages.length > 0);
  const isOpen = useChatStore((s) => s.isOpen);
  const { selectedModelId } = useSelectedModel();
  const { send, cancelGeneration } = useExamChat({
    examId,
    examUrl,
    courseCode,
    solutionUrl,
  });

  const [selectionContext, setSelectionContext] = useState("");
  const [isOverDrop, setIsOverDrop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const [initialDraft] = useState(() => {
    const { draftInput, draftAttachments } = chatStore.getState();
    return { text: draftInput, attachments: draftAttachments };
  });

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
    const text = (input?.getText() ?? "").trim();
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

  const replyToSelection = useCallback((text: string) => {
    setSelectionContext(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const startPendingSelection = useCallback(
    (pending: PendingSelection) => {
      if (chatStore.getState().isLoading) {
        setSelectionContext(pending.context);
        requestAnimationFrame(() => {
          if (!inputRef.current?.getText().trim())
            inputRef.current?.setText(pending.prompt);
          inputRef.current?.focus();
        });
        return;
      }
      void submit(pending.prompt, pending.context, []);
    },
    [chatStore, submit],
  );

  useEffect(() => {
    const store = chatStore.getState();
    if (store.currentExamId !== examId) {
      store.clearChat();
      chatStore.setState({ currentExamId: examId });
      inputRef.current?.discardAttachments();
    }
  }, [chatStore, examId]);

  useEffect(() => {
    const take = () => {
      const taken = chatStore.getState().takePendingSelection();
      if (taken) startPendingSelection(taken);
    };

    const frame = requestAnimationFrame(take);
    const unsubscribe = chatStore.subscribe((s, prev) => {
      if (s.pendingSelection && s.pendingSelection !== prev.pendingSelection)
        take();
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [chatStore, startPendingSelection]);

  useEffect(
    () => () => {
      chatStore.setState({
        draftInput: inputRef.current?.getText() ?? "",
        draftAttachments: inputRef.current?.getAttachments() ?? [],
      });
    },
    [chatStore],
  );

  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        if (!wasOpen.current) transcriptRef.current?.restoreScroll();
        wasOpen.current = true;
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    } else {
      wasOpen.current = false;
      chatStore.getState().setHistoryOpen(false);
      transcriptRef.current?.persistScrollPosition();
    }
  }, [chatStore, isOpen]);

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
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.repeat ||
        !(e.metaKey || e.ctrlKey) ||
        (e.key !== "." && e.code !== "Period")
      )
        return;
      const store = chatStore.getState();
      if (!store.isOpen) return;
      e.preventDefault();
      store.setHistoryOpen(!store.isHistoryOpen);
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [chatStore]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer?.types.includes("Files");
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
      if (!chatStore.getState().isOpen) return;
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
  }, [chatStore]);

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

  function startNewChat() {
    const store = chatStore.getState();
    store.clearChat();
    chatStore.setState({ currentExamId: examId });
    inputRef.current?.setText("");
    inputRef.current?.discardAttachments();
    setSelectionContext("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div
      ref={rootRef}
      className="relative flex h-full w-full flex-col overflow-hidden bg-background"
    >
      {isOverDrop && <ChatDropOverlay />}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-none relative isolate flex h-14 items-center justify-between gap-2 px-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[4.5rem] bg-[linear-gradient(to_bottom,var(--background)_0,var(--background)_55%,transparent_100%)]" />
          <div className="flex min-w-0 items-center gap-1">
            <HeaderButton
              icon={ChevronRightIcon}
              label="Stäng chatten"
              onClick={onClose}
            />
            <ConversationTitle />
          </div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-1">
            <HeaderButton
              icon={PlusIcon}
              label="Ny chatt"
              onClick={startNewChat}
            />
            <HeaderButton
              icon={HistoryIcon}
              label="Historik"
              onClick={() => {
                const store = chatStore.getState();
                store.setHistoryOpen(!store.isHistoryOpen);
              }}
            />
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
        onScroll={onScroll}
      >
        {hasMessages ? (
          <ChatMessages
            ref={transcriptRef}
            scrollRef={scrollRef}
            className="pt-16 pb-36 sm:pb-44"
            onReplyToSelection={replyToSelection}
            onScrollDistanceChange={updateScrollDistance}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pb-28 text-center">
            <ChatMascot className="size-14 shrink-0" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">
                Vad kan jag hjälpa till med?
              </h2>
              <p className="mx-auto max-w-70 text-sm leading-relaxed text-muted-foreground sm:max-w-md">
                Ställ frågor om tentan eller få hjälp att förstå lösningarna.
              </p>
            </div>
            <Link
              to="/ai-policy"
              target="_blank"
              className="mt-2 border-b border-transparent pb-0.5 text-2xs text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
            >
              Läs vår AI-policy
            </Link>
          </div>
        )}
      </div>

      <div className="chat-composer-backdrop pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pt-12 pb-3 sm:pb-4">
        <ScrollToBottomButton
          visible={showScrollBottom && hasMessages}
          onClick={scrollToLatest}
        />
        <ChatInput
          ref={inputRef}
          className="pointer-events-auto"
          initialText={initialDraft.text}
          initialAttachments={initialDraft.attachments}
          selectionContext={selectionContext}
          onSend={handleSend}
          onCancel={handleCancel}
          onClearSelectionContext={() => setSelectionContext("")}
        />
      </div>

      <ChatHistoryDialog onSelect={pinToBottom} />
    </div>
  );
}

function HeaderButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <IconButton
      variant="ghost"
      className="pointer-events-auto"
      aria-label={label}
      onClick={onClick}
    >
      <Icon />
    </IconButton>
  );
}
