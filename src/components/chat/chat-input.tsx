import {
  BookOpenIcon,
  PaperclipIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  ArrowUpIcon,
  FileTextIcon,
  ImageIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import {
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
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  RadioGroup as RadioGroupPrimitive,
  Slider as SliderPrimitive,
} from "radix-ui";
import {
  acceptFiles,
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_TOTAL_SIZE,
} from "@/lib/chat-attachments";
import { CHAT_EFFORTS, type ChatModelId } from "@/lib/chat-models";
import {
  activeMentionQuery,
  findMentionRanges,
  splitCourseMentions,
} from "@/lib/course-mentions";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat-limits";
import { formattedClipboardText } from "@/lib/chat-paste";
import { coursesQuery } from "@/queries/exams";
import {
  useChatStore,
  useChatStoreApi,
  type ChatAttachment,
} from "@/stores/chat";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  MOBILE_QUERY,
  useSelectedModel,
  useSettingsStore,
} from "@/stores/settings";
import {
  CourseMentionMenu,
  type CourseMentionMenuApi,
} from "./course-mention-menu";
import { SelectionQuote } from "./selection-quote";
import { IconButton } from "@/components/shared/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MAX_LENGTH = MAX_CHAT_MESSAGE_LENGTH;

const MENTION_PILL_CLASS =
  "rounded-[5px] bg-primary/15 text-transparent ring-2 ring-primary/15 box-decoration-clone";

const COUNTER_FROM = MAX_LENGTH * 0.8;

const MAX_TEXTAREA_HEIGHT = 192;

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
  courseExamAnalysis?: {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
  };
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
  courseExamAnalysis,
  onSend,
  onCancel,
  onClearSelectionContext,
}: ChatInputProps) {
  const chatStore = useChatStoreApi();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const isLoading = useChatStore((s) => s.isLoading);
  const reducedMotion = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionLayerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>(() =>
    initialAttachments.filter((a) => a.active && a.file),
  );
  const [hasText, setHasText] = useState(!!initialText.trim());
  const [hasInput, setHasInput] = useState(initialText.length > 0);
  const [longLength, setLongLength] = useState(0);
  const [mention, setMention] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const mentionMenuRef = useRef<CourseMentionMenuApi>(null);
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const quoteTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 38 };

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

    layer.replaceChildren(...nodes, document.createTextNode("​"));
    layer.scrollTop = textareaRef.current?.scrollTop ?? 0;
  };

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(MAX_TEXTAREA_HEIGHT, textarea.scrollHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  };

  const syncTextState = (value: string) => {
    setHasText(!!value.trim());
    setHasInput(value.length > 0);
    setLongLength(value.length >= COUNTER_FROM ? value.length : 0);
    renderMentionPills(value);
    resizeTextarea();
  };

  const setText = (value: string) => {
    if (textareaRef.current) textareaRef.current.value = value;
    syncTextState(value);
    setMention(null);
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
    resizeTextarea();
    let frame = 0;
    let width = shellRef.current?.clientWidth;
    const observer = new ResizeObserver(() => {
      if (shellRef.current?.clientWidth === width) return;
      width = shellRef.current?.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resizeTextarea);
    });
    if (shellRef.current) observer.observe(shellRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

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
        <div className="relative overflow-hidden rounded-xl border border-input bg-card shadow-[0_4px_4px_-8px_oklch(0_0_0/0.08),0_8px_28px_-8px_oklch(0_0_0/0.06)] dark:shadow-[0px_2px_20px_-100px_oklch(0_0_0/0.3),0_8px_28px_-8px_oklch(0_0_0/0.2)]">
          <AnimatePresence initial={false}>
            {selectionContext && (
              <m.div
                key="quote"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={quoteTransition}
                className="overflow-hidden"
              >
                <div className="px-3 pt-3">
                  <div className="relative w-48 max-w-full rounded-lg border bg-background py-3 pr-7 pl-3">
                    <div className="border-l-2 border-border pl-2.5 text-sm leading-snug text-muted-foreground">
                      <span className="line-clamp-5">
                        <SelectionQuote text={selectionContext} />
                      </span>
                    </div>
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute top-1 right-1"
                      aria-label="Ta bort citatet"
                      onClick={onClearSelectionContext}
                    >
                      <XIcon />
                    </IconButton>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex max-w-full min-w-0 items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-normal text-foreground"
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

          <div className="flex items-end gap-2 pr-2">
            <div className="relative min-w-0 flex-1">
              {!hasInput &&
                (welcome ? (
                  <WelcomePlaceholder />
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 top-3 truncate text-base leading-6 text-muted-foreground/70"
                  >
                    {placeholder}
                  </span>
                ))}
              {courseMentions && (
                <div
                  ref={mentionLayerRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden px-3 py-3 text-base leading-6 wrap-break-word whitespace-pre-wrap text-transparent"
                />
              )}
              <textarea
                ref={textareaRef}
                defaultValue={initialText}
                rows={1}
                aria-label="Meddelande"
                className="relative block w-full resize-none border-0 bg-transparent px-3 py-3 text-base leading-6 text-foreground outline-none"
                onInput={(e) => {
                  syncTextState(e.currentTarget.value);
                  syncMention(e.currentTarget);
                }}
                onPaste={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.clipboardData.files.length
                  )
                    return;
                  const text = formattedClipboardText(
                    event.clipboardData.getData("text/html"),
                  );
                  if (!text) return;
                  event.preventDefault();
                  const textarea = event.currentTarget;
                  replaceRange(
                    textarea.selectionStart,
                    textarea.selectionEnd,
                    text,
                  );
                  syncTextState(textarea.value);
                  syncMention(textarea);
                }}
                onSelect={(e) => syncMention(e.currentTarget)}
                onBlur={() => setMention(null)}
                onScroll={(e) => {
                  if (mentionLayerRef.current)
                    mentionLayerRef.current.scrollTop =
                      e.currentTarget.scrollTop;
                }}
                onKeyDown={onKeyDown}
              />
            </div>
            <div className="mb-2 shrink-0">
              <IconButton
                type="button"
                variant={isLoading ? "secondary" : "default"}
                className="size-8"
                aria-label={isLoading ? "Avbryt svar" : "Skicka meddelande"}
                hideTooltip
                disabled={!isLoading && !canSend}
                onClick={() => (isLoading ? onCancel() : submit())}
              >
                {isLoading ? <StopIcon /> : <ArrowUpIcon />}
              </IconButton>
            </div>
          </div>
        </div>

        <div className="relative mt-2 flex items-center gap-1 px-1">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                type="button"
                variant="ghost"
                className="size-8"
                aria-label="Lägg till i meddelandet"
                hideTooltip
                disabled={isLoading}
              >
                <PlusIcon className="size-5" strokeWidth={1.75} />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={12}
              collisionPadding={12}
              className="w-72 max-w-[calc(100vw-1.5rem)] rounded-xl p-1.5"
            >
              <DropdownMenuItem
                className="gap-2.5 rounded-lg px-2.5 py-2.5"
                disabled={capacityReached}
                onSelect={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon />
                Bifoga filer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {courseExamAnalysis && (
            <Button
              type="button"
              variant={courseExamAnalysis.enabled ? "default" : "ghost"}
              className={cn("h-8 gap-1.5 px-2 text-xs")}
              aria-pressed={courseExamAnalysis.enabled}
              title="Analysera kursens tentor i nästa meddelande"
              disabled={isLoading}
              onClick={() =>
                courseExamAnalysis.onChange(!courseExamAnalysis.enabled)
              }
            >
              <BookOpenIcon />
              <span className="max-sm:hidden">Kursens tentor</span>
            </Button>
          )}
          <p className="pointer-events-none absolute inset-x-0 mx-auto w-fit max-w-[50%] truncate text-center text-2xs text-muted-foreground max-sm:hidden">
            {showDisclaimer && "AI kan göra misstag. Kontrollera svar."}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {longLength > 0 && (
              <span
                className={cn(
                  "text-2xs",
                  tooLong
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {longLength.toLocaleString("sv-SE")} /{" "}
                {MAX_LENGTH.toLocaleString("sv-SE")}
              </span>
            )}
            {!mobile && <ModelPicker />}
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
      </div>
    </form>
  );
}

function StopIcon() {
  return <span className="size-2.5 rounded-xs bg-current" aria-hidden />;
}

function ModelPicker() {
  const [effortPreview, setEffortPreview] = useState<number | null>(null);
  const [draggingEffort, setDraggingEffort] = useState(false);
  const [holdingEffort, setHoldingEffort] = useState(false);
  const [animateEffort, setAnimateEffort] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const effortButtonRef = useRef<HTMLButtonElement>(null);
  const modelOptionsRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { selectedModelId, selectedEffort, availableModels, availableEfforts } =
    useSelectedModel();
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const setSelectedEffort = useSettingsStore((s) => s.setSelectedEffort);
  const modelLabel = (
    availableModels.find((model) => model.id === selectedModelId) ??
    availableModels[0]
  ).label;
  const effortLabel =
    CHAT_EFFORTS.find((e) => e.id === selectedEffort)?.label ?? "";
  const effortIndex = availableEfforts.findIndex(
    (e) => e.id === selectedEffort,
  );
  const viewTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 36 };

  useEffect(() => {
    const target = showModels
      ? modelOptionsRef.current?.querySelector<HTMLButtonElement>(
          '[data-state="checked"]',
        )
      : effortButtonRef.current;
    target?.focus({ preventScroll: true });
  }, [showModels]);

  const finishEffortDrag = () => {
    setHoldingEffort(false);
    setDraggingEffort(false);
    setEffortPreview(null);
  };

  return (
    <Popover
      onOpenChange={(open) => {
        finishEffortDrag();
        setAnimateEffort(false);
        if (!open) setShowModels(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-1 px-2 text-xs text-foreground/80"
          aria-label={`Modell: ${modelLabel}, tankenivå: ${effortLabel}`}
        >
          <span className="text-foreground">{modelLabel}</span> {effortLabel}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        collisionPadding={12}
        className="block w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[22px] p-0"
      >
        <m.div
          animate={{ height: showModels ? 196 : 112 }}
          initial={false}
          transition={viewTransition}
          className="relative"
          onKeyDown={(event) => {
            if (event.key === "Escape" && showModels) {
              event.preventDefault();
              event.stopPropagation();
              setShowModels(false);
            }
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {showModels ? (
              <m.div
                key="models"
                initial={{ opacity: 0, x: reducedMotion ? 0 : 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reducedMotion ? 0 : 32 }}
                transition={viewTransition}
                className="w-full p-3"
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="mx-auto mb-2 flex text-base"
                  onClick={() => setShowModels(false)}
                  aria-label="Tillbaka till tankenivå"
                >
                  <ChevronLeftIcon className="size-4 text-muted-foreground" />
                  Modell
                </Button>
                <RadioGroupPrimitive.Root
                  ref={modelOptionsRef}
                  aria-label="Modell"
                  value={selectedModelId}
                  onValueChange={(value) => {
                    setSelectedModelId(value as ChatModelId);
                    setShowModels(false);
                  }}
                  className="space-y-1"
                >
                  {availableModels.map((model) => (
                    <RadioGroupPrimitive.Item
                      asChild
                      key={model.id}
                      value={model.id}
                      onClick={() => setShowModels(false)}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 w-full justify-between rounded-xl data-[state=checked]:bg-muted"
                      >
                        {model.label}
                        <RadioGroupPrimitive.Indicator>
                          <CheckIcon className="size-4" />
                        </RadioGroupPrimitive.Indicator>
                      </Button>
                    </RadioGroupPrimitive.Item>
                  ))}
                </RadioGroupPrimitive.Root>
              </m.div>
            ) : (
              <m.div
                key="effort"
                initial={{ opacity: 0, x: reducedMotion ? 0 : -32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reducedMotion ? 0 : -32 }}
                transition={viewTransition}
                className="w-full px-4 pt-3 pb-4"
              >
                <Button
                  ref={effortButtonRef}
                  type="button"
                  variant="ghost"
                  className="mx-auto mb-3 flex h-9 gap-1 text-lg"
                  onClick={() => {
                    setAnimateEffort(false);
                    setShowModels(true);
                  }}
                  aria-label={`${effortLabel}, välj modell`}
                >
                  {effortLabel}
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Button>
                <SliderPrimitive.Root
                  className={cn(
                    "relative flex h-8 w-full touch-none items-center select-none [&>span:has([role=slider])]:duration-250 [&>span:has([role=slider])]:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:[&>span:has([role=slider])]:transition-none",
                    animateEffort && !draggingEffort
                      ? "[&>span:has([role=slider])]:transition-[left]"
                      : "[&>span:has([role=slider])]:transition-none",
                  )}
                  min={0}
                  max={availableEfforts.length - 1}
                  step={0.001}
                  value={[effortPreview ?? effortIndex]}
                  onValueChange={([value]) => {
                    setEffortPreview(value);
                    const effort = availableEfforts[Math.round(value)];
                    if (effort) setSelectedEffort(effort.id);
                  }}
                  onPointerDown={() => {
                    setAnimateEffort(true);
                    setHoldingEffort(true);
                  }}
                  onPointerMove={(event) => {
                    if (event.buttons) setDraggingEffort(true);
                  }}
                  onPointerUp={finishEffortDrag}
                  onPointerCancel={finishEffortDrag}
                  onLostPointerCapture={finishEffortDrag}
                  onKeyDown={(event) => {
                    if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                        "Home",
                        "End",
                        "PageUp",
                        "PageDown",
                      ].includes(event.key)
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      setAnimateEffort(true);
                      const lastIndex = availableEfforts.length - 1;
                      const nextIndex =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? lastIndex
                            : effortIndex +
                              (["ArrowRight", "ArrowUp", "PageUp"].includes(
                                event.key,
                              )
                                ? 1
                                : -1);
                      setEffortPreview(null);
                      setSelectedEffort(
                        availableEfforts[
                          Math.max(0, Math.min(lastIndex, nextIndex))
                        ].id,
                      );
                    }
                  }}
                >
                  <SliderPrimitive.Track className="relative h-7 w-full overflow-hidden rounded-full bg-foreground/15 ring-1 ring-foreground/15 ring-inset">
                    <SliderPrimitive.Range
                      className={cn(
                        "absolute h-full rounded-full bg-primary duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                        animateEffort && !draggingEffort
                          ? "transition-[right]"
                          : "transition-none",
                      )}
                    />
                  </SliderPrimitive.Track>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 flex items-center justify-between"
                  >
                    {availableEfforts.map((effort) => (
                      <span
                        key={effort.id}
                        className="size-1 rounded-full bg-foreground/30"
                      />
                    ))}
                  </div>
                  <SliderPrimitive.Thumb
                    asChild
                    aria-label="Tankenivå"
                    aria-valuetext={effortLabel}
                  >
                    <m.span
                      initial={false}
                      className="block size-8 rounded-full bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
                      animate={{
                        scale: holdingEffort && !reducedMotion ? 1.18 : 1,
                      }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 500, damping: 28 }
                      }
                    />
                  </SliderPrimitive.Thumb>
                </SliderPrimitive.Root>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </PopoverContent>
    </Popover>
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
      className="chat-welcome-placeholder pointer-events-none absolute inset-x-3 top-3 truncate text-left text-base leading-6 text-muted-foreground/70"
    >
      {WELCOME_PLACEHOLDERS[index]}
    </span>
  );
}
