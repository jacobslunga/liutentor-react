import {
  ChevronDownIcon,
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
import { IconButton } from "@/components/shared/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 4000;

const MENTION_PILL_CLASS =
  "rounded-[5px] bg-primary/15 text-transparent ring-2 ring-primary/15 box-decoration-clone";

const COUNTER_FROM = MAX_LENGTH * 0.8;

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
  welcome?: boolean;

  courseMentions?: boolean;

  showDisclaimer?: boolean;
  onSend: () => void;
  onCancel: () => void;
  onClearSelectionContext: () => void;
}

export function ChatInput({
  ref,
  initialText = "",
  initialAttachments = [],
  selectionContext,
  className,
  placeholder = "Fråga vad som helst",
  welcome = false,
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
  const [attachments, setAttachments] = useState<ChatAttachment[]>(() =>
    initialAttachments.filter((a) => a.active && a.file),
  );
  const [hasText, setHasText] = useState(!!initialText.trim());
  const [hasInput, setHasInput] = useState(initialText.length > 0);
  const [longLength, setLongLength] = useState(0);
  const [textHeight, setTextHeight] = useState(24);
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

    layer.replaceChildren(...nodes, document.createTextNode("\u200b"));
    layer.scrollTop = textareaRef.current?.scrollTop ?? 0;
  };

  const syncTextState = (value: string) => {
    setHasText(!!value.trim());
    setHasInput(value.length > 0);
    setLongLength(value.length >= COUNTER_FROM ? value.length : 0);
    renderMentionPills(value);
  };

  const measurePrompt = useCallback(() => {
    const textarea = textareaRef.current;
    const measurement = measurementRef.current;
    if (!textarea || !measurement) return;

    measurement.value = textarea.value;
    measurement.style.width = `${Math.max(1, textarea.clientWidth - (welcome ? 16 : 56))}px`;
    setTextHeight(Math.min(192, Math.max(24, measurement.scrollHeight)));
  }, [welcome]);

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

    const rest = /^\S*\s?/.exec(textarea.value.slice(textarea.selectionStart));
    const end = textarea.selectionStart + (rest?.[0].length ?? 0);
    replaceRange(mention.start, end, `@${code} `);
  }

  const { data: courses } = useQuery({
    ...coursesQuery,
    enabled: courseMentions,
  });
  const courseCodes = useMemo(
    () => new Set(courses?.map((c) => c.code)),
    [courses],
  );

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
    measurePrompt();
    const observer = new ResizeObserver(() => measurePrompt());
    if (shellRef.current) observer.observe(shellRef.current);
    return () => observer.disconnect();
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
    focus: () => textareaRef.current?.focus({ preventScroll: true }),
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

  const sendButton = (
    <IconButton
      variant={isLoading ? "secondary" : "default"}
      className={cn("rounded-lg", !welcome && "absolute right-0 bottom-0")}
      aria-label={isLoading ? "Avbryt svar" : "Skicka meddelande"}
      hideTooltip
      disabled={!isLoading && !canSend}
      onClick={() => (isLoading ? onCancel() : submit())}
    >
      {isLoading ? <StopIcon /> : <CornerDownLeftIcon />}
    </IconButton>
  );

  const toolbar = (
    <div
      className={cn(
        "grid grid-cols-2 items-center gap-x-2 px-1 sm:grid-cols-[1fr_auto_1fr]",
        welcome ? "mt-2" : "mt-0",
      )}
    >
      <div className="flex h-8 items-center gap-0.5">
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
          variant="ghost"
          className="rounded-full"
          aria-label="Bifoga filer"
          disabled={isLoading || capacityReached}
          onClick={() => fileInputRef.current?.click()}
        >
          <PlusIcon />
        </IconButton>
      </div>

      {showDisclaimer && (
        <p className="col-span-2 row-start-2 text-center text-2xs text-muted-foreground sm:col-span-1 sm:col-start-2 sm:row-start-1">
          AI kan göra misstag. Kontrollera svar.
        </p>
      )}
      <div className="col-start-2 row-start-1 flex h-8 items-center justify-end gap-1 sm:col-start-3">
        <ModelPicker />
        {welcome && sendButton}
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
      </div>
    </div>
  );

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
        className={cn(
          "chat-column relative mx-auto",
          welcome && "chat-welcome-column",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-input bg-card p-1.5 shadow-xs dark:shadow-[0_3px_10px_-1px_rgba(255,255,255,0.07)]",
            isLoading && "chat-prompt-generating",
          )}
        >
          {hasHeader && (
            <div className="-mx-1.5 -mt-1.5 mb-1.5 flex flex-col items-stretch gap-2 overflow-hidden border-b bg-muted/50 px-3 py-2">
              {selectionContext && (
                <div className="flex w-full animate-in items-center gap-2.5 duration-200 fade-in-0">
                  <CornerDownLeftIcon className="size-4 shrink-0 -scale-x-100 text-muted-foreground" />
                  <span className="line-clamp-3 min-w-0 flex-1 text-sm leading-relaxed font-normal text-foreground">
                    "<SelectionQuote text={selectionContext} />"
                  </span>
                  <IconButton
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Ta bort citatet"
                    onClick={onClearSelectionContext}
                  >
                    <XIcon />
                  </IconButton>
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
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ta bort ${a.name}`}
                        onClick={() => removeAttachment(a.id)}
                      >
                        <XIcon />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            {welcome && !hasInput && <WelcomePlaceholder />}
            {courseMentions && (
              <div
                ref={mentionLayerRef}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 overflow-hidden py-1 pl-2 text-[0.9375rem] leading-6 wrap-break-word whitespace-pre-wrap text-transparent",
                  welcome ? "pr-2" : "pr-12",
                )}
              />
            )}
            <textarea
              ref={textareaRef}
              defaultValue={initialText}
              rows={1}
              placeholder={welcome ? "" : placeholder}
              aria-label="Meddelande"
              className={cn(
                "relative block max-h-50 w-full resize-none overflow-y-auto border-0 bg-transparent py-1 pl-2 text-[0.9375rem] leading-6 text-foreground outline-none placeholder:text-muted-foreground",
                welcome ? "pr-2" : "pr-12",
              )}
              style={{
                height: welcome ? Math.max(72, textHeight + 8) : textHeight + 8,
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
            {!welcome && sendButton}
          </div>
          {welcome && toolbar}
        </div>

        {!welcome && toolbar}

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
          className="pointer-events-none invisible absolute h-0 overflow-hidden border-0 p-0 text-[0.9375rem] leading-6 whitespace-pre-wrap"
        />
      </div>
    </form>
  );
}

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Tankenivå">
          {label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="min-w-48">
        <DropdownMenuRadioGroup
          value={selectedModelId}
          onValueChange={(value) => setSelectedModelId(value as ChatModelId)}
        >
          {availableModels.map((model) => (
            <DropdownMenuRadioItem key={model.id} value={model.id}>
              {model.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const WELCOME_PLACEHOLDERS = [
  "Fråga något, eller skriv @ för att välja kurs",
  "Förklara ett begrepp jag fastnat på",
  "Hjälp mig förstå en tentauppgift",
  "Förhör mig inför nästa tenta",
];

function WelcomePlaceholder() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const update = () => {
      window.clearInterval(timer);
      if (!reducedMotion.matches) {
        timer = window.setInterval(() => {
          setIndex((current) => (current + 1) % WELCOME_PLACEHOLDERS.length);
        }, 5000);
      }
    };
    update();
    reducedMotion.addEventListener("change", update);
    return () => {
      window.clearInterval(timer);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  return (
    <span
      key={index}
      aria-hidden="true"
      className="chat-welcome-placeholder pointer-events-none absolute inset-x-2 top-1 text-left text-[0.9375rem] leading-6 text-muted-foreground"
    >
      {WELCOME_PLACEHOLDERS[index]}
    </span>
  );
}
