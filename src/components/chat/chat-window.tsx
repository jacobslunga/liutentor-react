import { Link } from "@tanstack/react-router";
import { ArrowDownIcon, ChevronRightIcon, HistoryIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChat } from "@/hooks/use-chat";
import { normalizeClipboardFile } from "@/lib/chat-attachments";
import { useChatStore, type PendingSelection } from "@/stores/chat";
import { useSelectedModel } from "@/stores/settings";
import { ChatDropOverlay } from "./chat-drop-overlay";
import { ChatHistoryDialog } from "./chat-history-dialog";
import { ChatInput, type ChatInputApi } from "./chat-input";
import { ChatMascot } from "./chat-mascot";
import { ChatMessages, type ChatTranscriptApi } from "./chat-messages";
import "./chat.css";

export interface ChatWindowProps {
  examId: string;
  courseCode: string;
  examUrl: string;
  solutionUrl: string | null;
  onClose: () => void;
}

/**
 * The exam chat panel (lazy-loaded, default export). Its own renders are
 * limited to discrete changes (empty/non-empty, open, quote, drop state);
 * streaming only reaches the transcript row being written.
 */
export default function ChatWindow({ examId, courseCode, examUrl, solutionUrl, onClose }: ChatWindowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputApi>(null);
  const transcriptRef = useRef<ChatTranscriptApi>(null);

  const hasMessages = useChatStore((s) => s.messages.length > 0);
  const isOpen = useChatStore((s) => s.isOpen);
  const conversationId = useChatStore((s) => s.currentConversationId);
  const { selectedModelId } = useSelectedModel();
  const { send, cancelGeneration } = useChat({ examId, examUrl, courseCode, solutionUrl });

  const [selectionContext, setSelectionContext] = useState("");
  const [isOverDrop, setIsOverDrop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Drafts are read once from the store when the panel mounts.
  const [initialDraft] = useState(() => {
    const { draftInput, draftAttachments } = useChatStore.getState();
    return { text: draftInput, attachments: draftAttachments };
  });

  const submit = useCallback(
    async (text: string, context?: string, attachments = inputRef.current?.getAttachments() ?? []) => {
      requestAnimationFrame(() => transcriptRef.current?.scrollUserMessageToTop());
      await send(text, attachments, { modelId: selectedModelId, selectionContext: context });
    },
    [send, selectedModelId],
  );

  function handleSend() {
    const input = inputRef.current;
    const text = input?.getText() ?? "";
    const attachments = input?.getAttachments() ?? [];
    if ((!text.trim() && !attachments.length) || useChatStore.getState().isLoading) return;
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

  // "Förklara" from the PDF: ask right away, or queue the quote while a reply streams.
  const startPendingSelection = useCallback(
    (pending: PendingSelection) => {
      if (useChatStore.getState().isLoading) {
        setSelectionContext(pending.context);
        requestAnimationFrame(() => {
          if (!inputRef.current?.getText().trim()) inputRef.current?.setText(pending.prompt);
          inputRef.current?.focus();
        });
        return;
      }
      void submit(pending.prompt, pending.context, []);
    },
    [submit],
  );

  // A panel for another exam starts from an empty chat.
  useEffect(() => {
    const store = useChatStore.getState();
    if (store.currentExamId !== examId) {
      store.clearChat();
      useChatStore.setState({ currentExamId: examId });
      inputRef.current?.discardAttachments();
    }
  }, [examId]);

  useEffect(() => {
    const take = () => {
      const taken = useChatStore.getState().takePendingSelection();
      if (taken) startPendingSelection(taken);
    };
    // One may already be waiting (the panel mounts on "Förklara"); the input exists next frame.
    const frame = requestAnimationFrame(take);
    const unsubscribe = useChatStore.subscribe((s, prev) => {
      if (s.pendingSelection && s.pendingSelection !== prev.pendingSelection) take();
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [startPendingSelection]);

  // Keep what was typed when the panel unmounts (e.g. switching layouts).
  useEffect(
    () => () => {
      useChatStore.setState({
        draftInput: inputRef.current?.getText() ?? "",
        draftAttachments: inputRef.current?.getAttachments() ?? [],
      });
    },
    [],
  );

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        transcriptRef.current?.restoreScroll();
        inputRef.current?.focus();
      });
    } else {
      useChatStore.getState().setHistoryOpen(false);
      transcriptRef.current?.persistScrollPosition();
    }
  }, [isOpen]);

  // Opening a saved conversation lands at its end.
  const pinToBottom = useCallback(() => {
    for (const delay of [0, 30, 80, 160, 300]) {
      setTimeout(() => transcriptRef.current?.scrollToBottom("auto"), delay);
    }
  }, []);

  useEffect(() => {
    if (conversationId && !useChatStore.getState().isLoading) pinToBottom();
  }, [conversationId, pinToBottom]);

  // Cmd/Ctrl+. toggles history.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || !(e.metaKey || e.ctrlKey) || (e.key !== "." && e.code !== "Period")) return;
      const store = useChatStore.getState();
      if (!store.isOpen) return;
      e.preventDefault();
      store.setHistoryOpen(!store.isHistoryOpen);
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // Files: drop anywhere on the panel, or paste while it is open.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
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
      if (!useChatStore.getState().isOpen) return;
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

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    // Hysteresis keeps the button from flickering near the threshold.
    if (distance > 160) setShowScrollBottom(true);
    else if (distance < 80) setShowScrollBottom(false);
  }

  function startNewChat() {
    const store = useChatStore.getState();
    store.clearChat();
    useChatStore.setState({ currentExamId: examId });
    inputRef.current?.setText("");
    inputRef.current?.discardAttachments();
    setSelectionContext("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      {isOverDrop && <ChatDropOverlay />}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-none relative isolate flex h-14 items-center justify-between gap-2 px-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 bg-linear-to-b from-background to-transparent" />
          <HeaderButton label="Stäng chatten" onClick={onClose}>
            <ChevronRightIcon />
          </HeaderButton>
          <div className="pointer-events-auto flex shrink-0 items-center gap-1">
            <HeaderButton label="Ny chatt" onClick={startNewChat}>
              <PlusIcon />
            </HeaderButton>
            <HeaderButton
              label="Historik"
              onClick={() => {
                const store = useChatStore.getState();
                store.setHistoryOpen(!store.isHistoryOpen);
              }}
            >
              <HistoryIcon />
            </HeaderButton>
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
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pb-28 text-center">
            <ChatMascot className="size-14 shrink-0" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Vad kan jag hjälpa till med?</h2>
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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center bg-linear-to-t from-background to-transparent pt-10 pb-3 sm:pb-4">
        {showScrollBottom && hasMessages && (
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto mb-2.5 animate-in rounded-full shadow-md duration-150 fade-in-0"
            aria-label="Rulla till senaste"
            onClick={() => {
              setShowScrollBottom(false);
              transcriptRef.current?.scrollToBottom("smooth");
            }}
          >
            <ArrowDownIcon />
          </Button>
        )}
        <ChatInput
          ref={inputRef}
          className="pointer-events-auto mx-auto max-w-2xl 3xl:max-w-3xl"
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

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="pointer-events-auto" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
