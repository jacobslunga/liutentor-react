import { ActionList, ActionMenu, IconButton } from "@primer/react";
import {
  ArrowUpIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  ImageIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  acceptFiles,
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_TOTAL_SIZE,
} from "@/lib/chat-attachments";
import type { ChatModelId } from "@/lib/chat-models";
import {
  activeMentionQuery,
  findMentionRanges,
  splitCourseMentions,
} from "@/lib/course-mentions";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { coursesQuery } from "@/queries/exams";
import {
  useChatStore,
  useChatStoreApi,
  type ChatAttachment,
} from "@/stores/chat";
import { useSelectedModel, useSettingsStore } from "@/stores/settings";
import {
  CourseMentionMenu,
  type CourseMentionMenuApi,
} from "./course-mention-menu";
import { SelectionQuote } from "./selection-quote";

const MAX_LENGTH = 4000;
/**
 * A course pill drawn behind the textarea's own text. The ring paints outside
 * the box, so the pill never shifts the text it sits under.
 */
const MENTION_PILL_CLASS =
  "rounded-[5px] bg-primary/15 text-transparent ring-2 ring-primary/15 box-decoration-clone";
/** The counter stays hidden until the user approaches the limit. */
const COUNTER_FROM = MAX_LENGTH * 0.8;

interface PromptLayout {
  expanded: boolean;
  textHeight: number;
  leftWidth: number;
  rightWidth: number;
  animate: boolean;
}

const INITIAL_PROMPT_LAYOUT: PromptLayout = {
  expanded: false,
  textHeight: 24,
  leftWidth: 64,
  rightWidth: 120,
  animate: false,
};

export interface ChatInputApi {
  focus: () => void;
  getText: () => string;
  setText: (value: string) => void;
  getAttachments: () => ChatAttachment[];
  setAttachments: (value: ChatAttachment[]) => void;
  clearAttachments: () => void;
  discardAttachments: () => void;
  addFiles: (files: File[]) => void;
}

interface ChatInputProps {
  ref?: Ref<ChatInputApi>;
  initialText?: string;
  initialAttachments?: ChatAttachment[];
  selectionContext?: string;
  className?: string;
  placeholder?: string;
  /** Suggest courses when the user types "@" (the learning chat). */
  courseMentions?: boolean;
  /** The "AI kan göra misstag" line under the prompt. */
  showDisclaimer?: boolean;
  onSend: () => void;
  onCancel: () => void;
  onClearSelectionContext: () => void;
}

/**
 * The prompt. Text stays in the uncontrolled textarea; React tracks only the
 * lightweight send state and measured compact/expanded layout.
 */
export function ChatInput({
  ref,
  initialText = "",
  initialAttachments = [],
  selectionContext,
  className,
  placeholder = "Fråga vad som helst",
  courseMentions = false,
  showDisclaimer = true,
  onSend,
  onCancel,
  onClearSelectionContext,
}: ChatInputProps) {
  const chatStore = useChatStoreApi();
  const isLoading = useChatStore((s) => s.isLoading);
  const shellRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftControlsRef = useRef<HTMLDivElement>(null);
  const rightControlsRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(INITIAL_PROMPT_LAYOUT);
  const animationTimerRef = useRef<number | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>(() =>
    initialAttachments.filter((a) => a.active && a.file),
  );
  const [hasText, setHasText] = useState(!!initialText.trim());
  const [longLength, setLongLength] = useState(0);
  const [layout, setLayout] = useState(INITIAL_PROMPT_LAYOUT);
  const [mention, setMention] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const mentionMenuRef = useRef<CourseMentionMenuApi>(null);
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const mentionLayerRef = useRef<HTMLDivElement>(null);

  /** Redraws the course pills; written to the DOM so typing never re-renders. */
  const renderMentionPills = (value: string) => {
    const layer = mentionLayerRef.current;
    if (!layer) return;
    const nodes = splitCourseMentions(value).map((part) => {
      if (part.type === "text") return document.createTextNode(part.text);
      const pill = document.createElement("span");
      pill.className = MENTION_PILL_CLASS;
      pill.textContent = part.text;
      return pill;
    });
    // A trailing newline only takes up a line when something follows it.
    layer.replaceChildren(...nodes, document.createTextNode("\u200b"));
    layer.scrollTop = textareaRef.current?.scrollTop ?? 0;
  };

  const syncTextState = (value: string) => {
    setHasText(!!value.trim());
    setLongLength(value.length >= COUNTER_FROM ? value.length : 0);
    renderMentionPills(value);
  };

  const measurePrompt = useCallback((allowAnimation = true) => {
    const shell = shellRef.current;
    const textarea = textareaRef.current;
    const measurement = measurementRef.current;
    if (!shell || !textarea || !measurement) return;

    const leftWidth = leftControlsRef.current?.offsetWidth ?? 64;
    const rightWidth = rightControlsRef.current?.offsetWidth ?? 120;
    const compactTextWidth = Math.max(
      1,
      shell.clientWidth - leftWidth - rightWidth - 44,
    );

    measurement.value = textarea.value;
    measurement.style.width = `${compactTextWidth}px`;
    const expanded =
      textarea.value.includes("\n") || measurement.scrollHeight > 24;
    measurement.style.width = `${expanded ? shell.clientWidth - 44 : compactTextWidth}px`;
    const textHeight = Math.min(192, Math.max(24, measurement.scrollHeight));

    const previous = layoutRef.current;
    const startsExpansion =
      allowAnimation &&
      !previous.expanded &&
      expanded &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next: PromptLayout = {
      expanded,
      textHeight,
      leftWidth,
      rightWidth,
      animate: startsExpansion || (previous.animate && expanded),
    };

    layoutRef.current = next;
    setLayout((current) =>
      current.expanded === next.expanded &&
      current.textHeight === next.textHeight &&
      current.leftWidth === next.leftWidth &&
      current.rightWidth === next.rightWidth &&
      current.animate === next.animate
        ? current
        : next,
    );

    if (!startsExpansion) return;
    if (animationTimerRef.current)
      window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(() => {
      const settled = { ...layoutRef.current, animate: false };
      layoutRef.current = settled;
      setLayout(settled);
      animationTimerRef.current = null;
    }, 200);
  }, []);

  const setText = (value: string) => {
    if (textareaRef.current) textareaRef.current.value = value;
    syncTextState(value);
    setMention(null);
    measurePrompt();
  };

  function syncMention(textarea: HTMLTextAreaElement) {
    if (!courseMentions) return;
    const next =
      textarea.selectionStart === textarea.selectionEnd
        ? activeMentionQuery(textarea.value, textarea.selectionStart)
        : null;
    setMention((current) =>
      current?.start === next?.start && current?.query === next?.query
        ? current
        : next,
    );
  }

  /**
   * Replaces `start..end` as if typed: execCommand keeps the edit on the undo
   * stack and fires `input`, which syncs everything else.
   */
  function replaceRange(start: number, end: number, text: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const before = textarea.value;
    const expected = before.slice(0, start) + text + before.slice(end);
    textarea.focus();
    textarea.setSelectionRange(start, end);
    const done = document.execCommand(
      text ? "insertText" : "delete",
      false,
      text,
    );
    // Firefox can drop trailing whitespace from insertText; whatever the
    // browser did (or refused to do), make the value what was asked for.
    if (!done || textarea.value !== expected) {
      textarea.value = expected;
      const caret = start + text.length;
      textarea.setSelectionRange(caret, caret);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function pickMention(code: string) {
    const textarea = textareaRef.current;
    if (!textarea || !mention) return;
    // Take the rest of the word under the caret, and one space after it, so the
    // inserted trailing space never doubles up.
    const rest = /^\S*\s?/.exec(textarea.value.slice(textarea.selectionStart));
    const end = textarea.selectionStart + (rest?.[0].length ?? 0);
    replaceRange(mention.start, end, `@${code} `);
  }

  // Known courses delete as one unit; a code still being typed does not.
  const { data: courses } = useQuery({
    ...coursesQuery,
    enabled: courseMentions,
  });
  const courseCodes = useMemo(
    () => new Set(courses?.map((c) => c.code)),
    [courses],
  );

  /** Backspace/Delete next to a course mention removes all of it. */
  function deleteMention(key: string): boolean {
    const textarea = textareaRef.current;
    if (!courseMentions || !textarea) return false;
    const caret = textarea.selectionStart;
    if (caret !== textarea.selectionEnd) return false;
    const range = findMentionRanges(textarea.value).find(
      ({ start, end, code }) =>
        courseCodes.has(code) &&
        (key === "Backspace"
          ? caret > start && caret <= end
          : caret >= start && caret < end),
    );
    if (!range) return false;
    replaceRange(range.start, range.end, "");
    return true;
  }

  useLayoutEffect(() => {
    measurePrompt(false);
    const observer = new ResizeObserver(() => measurePrompt());
    if (shellRef.current) observer.observe(shellRef.current);
    if (leftControlsRef.current) observer.observe(leftControlsRef.current);
    if (rightControlsRef.current) observer.observe(rightControlsRef.current);
    return () => {
      observer.disconnect();
      if (animationTimerRef.current)
        window.clearTimeout(animationTimerRef.current);
    };
  }, [measurePrompt]);

  const addFiles = (files: File[]) => {
    if (chatStore.getState().isLoading) return;
    const existing = [
      ...chatStore.getState().getActiveAttachments(),
      ...attachmentsRef.current,
    ];
    const { accepted, errors } = acceptFiles(files, existing);
    if (accepted.length) setAttachments((current) => [...current, ...accepted]);
    for (const error of errors) toast.error(error);
  };

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getText: () => textareaRef.current?.value ?? "",
    setText,
    getAttachments: () => [...attachmentsRef.current],
    setAttachments: (value) =>
      setAttachments(value.filter((a) => a.active && a.file)),
    clearAttachments: () => setAttachments([]),
    discardAttachments: () => {
      for (const a of attachmentsRef.current)
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      setAttachments([]);
    },
    addFiles,
  }));

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
    renderMentionPills(textareaRef.current?.value ?? "");
  }, []);

  const tooLong = longLength > MAX_LENGTH;
  const canSend = (hasText || attachments.length > 0) && !tooLong;
  // Primitive selectors: the input must not re-render while a reply streams.
  const activeCount = useChatStore((s) => s.getActiveAttachments().length);
  const activeBytes = useChatStore((s) =>
    s.getActiveAttachments().reduce((sum, a) => sum + a.size, 0),
  );
  const capacityReached =
    activeCount + attachments.length >= MAX_ATTACHMENTS ||
    activeBytes + attachments.reduce((sum, a) => sum + a.size, 0) >=
      MAX_ATTACHMENTS_TOTAL_SIZE;

  function submit() {
    if (canSend && !isLoading) onSend();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (mention && mentionMenuRef.current?.handleKey(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Modified deletes (word, line) keep their native behaviour.
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      deleteMention(e.key)
    ) {
      e.preventDefault();
      return;
    }
    // Enter sends; Shift+Enter keeps a newline.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      e.stopPropagation();
      submit();
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const removed = current.find((a) => a.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((a) => a.id !== id);
    });
  }

  const hasHeader = !!selectionContext || attachments.length > 0;

  return (
    <form
      className={cn("w-full px-3 sm:px-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div
        ref={shellRef}
        // Matches the transcript's width, so the prompt lines up with it.
        className="chat-column relative mx-auto"
      >
        <div
          className={cn(
            "relative overflow-hidden border border-input bg-background p-2.5 shadow-xs",
            layout.expanded && "pb-13",
            // Single row is a pill; extra rows or a header settle to 2xl.
            layout.expanded || hasHeader ? "rounded-2xl" : "rounded-[1.75rem]",
            layout.animate &&
              "transition-[border-radius,padding-bottom] duration-200 ease-out",
            isLoading && "chat-prompt-generating",
          )}
        >
          {hasHeader && (
            <div className="-mx-2.5 -mt-2.5 mb-2 flex flex-col items-stretch gap-2 overflow-hidden rounded-t-xl border-b bg-muted/50 px-2.5 pt-2 pb-2.5">
              {selectionContext && (
                <div className="flex w-full animate-in items-start gap-3 duration-200 fade-in-0">
                  <CornerDownLeftIcon className="mt-0.5 size-4 shrink-0 -scale-x-100" />
                  <span className="line-clamp-3 min-w-0 flex-1 text-sm leading-relaxed font-normal text-foreground">
                    "<SelectionQuote text={selectionContext} />"
                  </span>
                  <IconButton
                    icon={XIcon}
                    variant="invisible"
                    size="small"
                    aria-label="Ta bort citatet"
                    onClick={onClearSelectionContext}
                  />
                </div>
              )}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex max-w-full min-w-0 animate-in items-center gap-2 rounded-lg bg-background px-2.5 py-1.5 text-xs font-normal text-foreground duration-200 fade-in-0 slide-in-from-bottom-1"
                    >
                      {a.mediaType === "application/pdf" ? (
                        <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : a.previewUrl ? (
                        <img
                          src={a.previewUrl}
                          alt=""
                          className="size-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="max-w-20 truncate" title={a.name}>
                        {a.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatFileSize(a.size)}
                      </span>
                      <IconButton
                        icon={XIcon}
                        variant="invisible"
                        size="small"
                        aria-label={`Ta bort ${a.name}`}
                        onClick={() => removeAttachment(a.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            {courseMentions && (
              <div
                ref={mentionLayerRef}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 overflow-hidden py-1 text-[0.9375rem] leading-6 wrap-break-word whitespace-pre-wrap text-transparent",
                  layout.animate &&
                    "transition-[padding] duration-200 ease-out",
                )}
                style={{
                  paddingLeft: layout.expanded ? 8 : layout.leftWidth + 8,
                  paddingRight: layout.expanded ? 8 : layout.rightWidth + 8,
                }}
              />
            )}
            <textarea
              ref={textareaRef}
              defaultValue={initialText}
              rows={1}
              placeholder={placeholder}
              aria-label="Meddelande"
              className={cn(
                "relative block max-h-50 w-full resize-none overflow-y-auto border-0 bg-transparent py-1 text-[0.9375rem] leading-6 text-foreground outline-none placeholder:text-muted-foreground",
                layout.expanded && "min-h-16",
                layout.animate &&
                  "transition-[height,min-height,padding] duration-200 ease-out",
              )}
              style={{
                height: layout.textHeight + 8,
                paddingLeft: layout.expanded ? 8 : layout.leftWidth + 8,
                paddingRight: layout.expanded ? 8 : layout.rightWidth + 8,
              }}
              onInput={(e) => {
                syncTextState(e.currentTarget.value);
                syncMention(e.currentTarget);
                measurePrompt();
              }}
              onSelect={(e) => syncMention(e.currentTarget)}
              onBlur={() => setMention(null)}
              onScroll={(e) => {
                if (mentionLayerRef.current)
                  mentionLayerRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              onKeyDown={onKeyDown}
            />
          </div>

          <div
            ref={leftControlsRef}
            className="absolute bottom-2.5 left-2.5 flex h-8 items-center gap-0.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={FILE_INPUT_ACCEPT}
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
            <IconButton
              icon={PlusIcon}
              variant="invisible"
              className="rounded-full"
              aria-label="Bifoga filer"
              disabled={isLoading || capacityReached}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>

          <div
            ref={rightControlsRef}
            className="absolute right-2.5 bottom-2.5 flex h-8 shrink-0 items-center gap-1"
          >
            <ModelPicker />
            {longLength > 0 && (
              <span
                className={cn(
                  "text-2xs",
                  tooLong
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {longLength} / {MAX_LENGTH}
              </span>
            )}
            <IconButton
              icon={isLoading ? StopIcon : ArrowUpIcon}
              variant="primary"
              className="rounded-full"
              aria-label={isLoading ? "Avbryt svar" : "Skicka meddelande"}
              unsafeDisableTooltip
              disabled={!isLoading && !canSend}
              onClick={() => (isLoading ? onCancel() : submit())}
            />
          </div>
        </div>

        {mention && (
          <CourseMentionMenu
            ref={mentionMenuRef}
            query={mention.query}
            onPick={pickMention}
            onClose={() => setMention(null)}
          />
        )}

        <textarea
          ref={measurementRef}
          aria-hidden="true"
          tabIndex={-1}
          rows={1}
          className="pointer-events-none absolute h-0 overflow-hidden border-0 p-0 text-[0.9375rem] leading-6 whitespace-pre-wrap invisible"
        />
      </div>
      {showDisclaimer && (
        <p className="mt-2 text-center text-2xs text-muted-foreground">
          AI kan göra misstag. Kontrollera svar.
        </p>
      )}
    </form>
  );
}

/** The "stop generating" square shown on the send button while streaming. */
function StopIcon() {
  return <span className="size-2.5 rounded-xs bg-current" aria-hidden />;
}

function ModelPicker() {
  const { selectedModelId, availableModels } = useSelectedModel();
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const label =
    availableModels.find((m) => m.id === selectedModelId)?.label ??
    availableModels[0].label;

  return (
    <ActionMenu>
      <ActionMenu.Button variant="invisible" size="small" aria-label="Tankenivå">
        {label}
      </ActionMenu.Button>
      <ActionMenu.Overlay side="outside-top" align="end" width="small">
        <ActionList selectionVariant="single">
          {availableModels.map((model) => (
            <ActionList.Item
              key={model.id}
              selected={model.id === selectedModelId}
              onSelect={() => setSelectedModelId(model.id as ChatModelId)}
            >
              {model.label}
            </ActionList.Item>
          ))}
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}
