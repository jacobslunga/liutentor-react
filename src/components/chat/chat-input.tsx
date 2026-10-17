import {
  CheckIcon,
  ChevronDownIcon,
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
import { m, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  acceptFiles,
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_TOTAL_SIZE,
} from "@/lib/chat-attachments";
import {
  CHAT_EFFORTS,
  type ChatEffort,
  type ChatModelId,
} from "@/lib/chat-models";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = MAX_CHAT_MESSAGE_LENGTH;

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
  const mobile = useMediaQuery(MOBILE_QUERY);
  const isLoading = useChatStore((s) => s.isLoading);
  const shellRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
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
  const [textExpanded, setTextExpanded] = useState(false);
  const reducedMotion = useReducedMotion();
  const plusRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
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
  const hasHeader = !!selectionContext || attachments.length > 0;
  const expanded = hasHeader || textExpanded;
  const layoutKey = `${expanded}-${hasHeader}-${attachments.length}`;
  const layoutTransition = {
    layout: {
      type: "tween" as const,
      duration: reducedMotion ? 0 : 0.16,
      ease: [0.2, 0.8, 0.2, 1] as const,
    },
  };

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
    const composer = composerRef.current;
    const plus = plusRef.current;
    const controls = controlsRef.current;
    if (!textarea || !measurement || !composer || !plus || !controls) return;

    // Whether the text fits on one row is always decided at the compact
    // width, so expanding never feeds back into the decision.
    const style = getComputedStyle(composer);
    const gutter =
      parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const contentWidth = composer.clientWidth - gutter;
    const compactWidth =
      contentWidth - plus.offsetWidth - controls.offsetWidth - 8;
    const measureAt = (width: number) => {
      measurement.value = textarea.value;
      measurement.style.width = `${Math.max(1, width)}px`;
      return measurement.scrollHeight;
    };
    const compactHeight = measureAt(compactWidth - 16);
    const lineHeight = parseFloat(getComputedStyle(measurement).lineHeight);
    const wraps = textarea.value.length > 0 && compactHeight > lineHeight + 1;
    const wantExpanded = hasHeader || wraps;
    const height = wantExpanded ? measureAt(contentWidth - 16) : compactHeight;

    setTextExpanded(wraps);
    setTextHeight(Math.min(192, Math.max(lineHeight, height)));
  }, [hasHeader]);

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
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measurePrompt);
    });
    if (shellRef.current) observer.observe(shellRef.current);
    if (controlsRef.current) observer.observe(controlsRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
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

  const sendButton = (
    <IconButton
      type="button"
      variant={isLoading ? "secondary" : "default"}
      className="size-9 rounded-full [&_svg:not([class*='size-'])]:size-4"
      aria-label={isLoading ? "Avbryt svar" : "Skicka meddelande"}
      hideTooltip
      disabled={!isLoading && !canSend}
      onClick={() => (isLoading ? onCancel() : submit())}
    >
      {isLoading ? <StopIcon /> : <ArrowUpIcon />}
    </IconButton>
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
          welcome ? "chat-welcome-column" : "px-4 sm:px-5",
        )}
      >
        <m.div
          ref={composerRef}
          layout
          layoutDependency={layoutKey}
          transition={layoutTransition}
          style={{ borderRadius: expanded || hasHeader ? "1.25rem" : "2rem" }}
          data-expanded={expanded || hasHeader}
          className={cn(
            "relative min-h-14 overflow-hidden rounded-full border border-border/70 bg-card p-2.5 shadow-[0_2px_6px_-2px_oklch(0_0_0/0.08),0_8px_28px_-8px_oklch(0_0_0/0.06)] data-[expanded=true]:rounded-[20px] dark:border-border dark:shadow-[0_2px_8px_-2px_oklch(0_0_0/0.3),0_8px_28px_-8px_oklch(0_0_0/0.2)]",
          )}
        >
          {hasHeader && (
            <m.div
              layout="position"
              layoutDependency={layoutKey}
              transition={layoutTransition}
              className="-mx-2.5 -mt-2.5 overflow-hidden"
            >
              <div className="mb-1.5 flex flex-col items-stretch gap-2 border-b bg-muted/50 px-3 py-2">
                {selectionContext && (
                  <div className="flex w-full items-center gap-2.5">
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
                        className="flex max-w-full min-w-0 items-center gap-2 rounded-lg bg-background px-2.5 py-1.5 text-xs font-normal text-foreground"
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
            </m.div>
          )}

          <div
            className={cn(
              "grid gap-x-1 gap-y-1",
              expanded ? "items-end" : "items-center",
            )}
            style={{
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
              gridTemplateAreas: expanded
                ? '"text text text" "plus . controls"'
                : '"plus text controls"',
            }}
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
            <m.div
              layout="position"
              layoutDependency={layoutKey}
              transition={layoutTransition}
              ref={plusRef}
              style={{ gridArea: "plus" }}
            >
              <IconButton
                variant="ghost"
                className="size-8 rounded-full p-0"
                aria-label="Bifoga filer"
                disabled={isLoading || capacityReached}
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusIcon className="size-6" strokeWidth={1.75} />
              </IconButton>
            </m.div>
            <m.div
              layout="position"
              layoutDependency={layoutKey}
              transition={layoutTransition}
              className="relative min-w-0"
              style={{ gridArea: "text" }}
            >
              {!hasInput &&
                (welcome ? (
                  <WelcomePlaceholder />
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-2 top-1 truncate text-base leading-6 text-muted-foreground/70"
                  >
                    {placeholder}
                  </span>
                ))}
              {courseMentions && (
                <div
                  ref={mentionLayerRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden py-1 pr-2 pl-2 text-base leading-6 wrap-break-word whitespace-pre-wrap text-transparent"
                />
              )}
              <textarea
                ref={textareaRef}
                defaultValue={initialText}
                rows={1}
                aria-label="Meddelande"
                className="relative block max-h-52 w-full resize-none border-0 bg-transparent px-2 py-1 text-base leading-6 text-foreground outline-none placeholder:text-foreground"
                style={{
                  height: textHeight + 8,
                  overflowY: textHeight >= 192 ? "auto" : "hidden",
                }}
                onInput={(e) => {
                  syncTextState(e.currentTarget.value);
                  syncMention(e.currentTarget);
                  measurePrompt();
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
                  measurePrompt();
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
            </m.div>
            <m.div
              layout="position"
              layoutDependency={layoutKey}
              transition={layoutTransition}
              ref={controlsRef}
              className="flex items-center gap-1"
              style={{ gridArea: "controls" }}
            >
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
              {sendButton}
            </m.div>
          </div>
        </m.div>

        {showDisclaimer && (
          <p className="mt-2 text-center text-2xs text-muted-foreground">
            AI kan göra misstag. Kontrollera svar.
          </p>
        )}

        {mention && (
          <CourseMentionMenu
            ref={mentionMenuRef}
            className={welcome ? undefined : "inset-x-4 sm:inset-x-5"}
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
          className="pointer-events-none invisible absolute h-0 overflow-hidden border-0 p-0 text-base leading-6 whitespace-pre-wrap"
        />
      </div>
    </form>
  );
}

function StopIcon() {
  return <span className="size-2.5 rounded-xs bg-current" aria-hidden />;
}

function ModelPicker() {
  const { selectedModelId, selectedEffort, availableModels, availableEfforts } =
    useSelectedModel();
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const setSelectedEffort = useSettingsStore((s) => s.setSelectedEffort);
  const model =
    availableModels.find((m) => m.id === selectedModelId) ?? availableModels[0];
  const effortLabel =
    CHAT_EFFORTS.find((e) => e.id === selectedEffort)?.label ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1 rounded-full px-2.5 text-xs text-foreground/80"
          aria-label="Modell och tankenivå"
        >
          {model.label}
          <span className="text-muted-foreground">{effortLabel}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={8}
        className="flex w-56 min-w-0 flex-col gap-1 rounded-xl p-1"
      >
        <DropdownMenuItem
          className="items-start gap-2.5 rounded-lg px-2.5 py-1.5"
          onSelect={(e) => e.preventDefault()}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="leading-snug">{model.label}</span>
            <span className="text-xs leading-snug font-normal text-muted-foreground">
              {model.hint}
            </span>
          </div>
          <CheckIcon className="mt-0.5 size-4 text-primary" />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-lg px-2.5 py-1.5">
            <span className="flex-1">Tankenivå</span>
            <span className="text-muted-foreground">{effortLabel}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40 rounded-xl p-1">
            <DropdownMenuRadioGroup
              value={selectedEffort}
              onValueChange={(value) => setSelectedEffort(value as ChatEffort)}
            >
              {availableEfforts.map((effort) => (
                <DropdownMenuRadioItem
                  key={effort.id}
                  value={effort.id}
                  className="rounded-lg px-2.5 py-1.5 text-xs"
                >
                  {effort.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-lg px-2.5 py-1.5">
            Fler modeller
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60 rounded-xl p-1">
            <DropdownMenuRadioGroup
              value={selectedModelId}
              onValueChange={(value) =>
                setSelectedModelId(value as ChatModelId)
              }
            >
              {availableModels.map((m) => (
                <DropdownMenuRadioItem
                  key={m.id}
                  value={m.id}
                  className="items-start rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <div className="flex flex-col">
                    <span className="text-xs leading-snug">{m.label}</span>
                    <span className="text-2xs leading-snug font-normal text-muted-foreground">
                      {m.hint}
                    </span>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
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
      className="chat-welcome-placeholder text-muted-foreground70 pointer-events-none absolute inset-x-2 top-1 truncate text-left text-base leading-6"
    >
      {WELCOME_PLACEHOLDERS[index]}
    </span>
  );
}
