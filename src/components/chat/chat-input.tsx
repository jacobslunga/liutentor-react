import {
  ArrowUpIcon,
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
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  acceptFiles,
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_TOTAL_SIZE,
} from "@/lib/chat-attachments";
import type { ChatModelId } from "@/lib/chat-models";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChatStore, type ChatAttachment } from "@/stores/chat";
import { useSelectedModel, useSettingsStore } from "@/stores/settings";
import { SelectionQuote } from "./selection-quote";

const MAX_LENGTH = 4000;
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
  onSend,
  onCancel,
  onClearSelectionContext,
}: ChatInputProps) {
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
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const syncTextState = (value: string) => {
    setHasText(!!value.trim());
    setLongLength(value.length >= COUNTER_FROM ? value.length : 0);
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
      shell.clientWidth - leftWidth - rightWidth - 40,
    );

    measurement.value = textarea.value;
    measurement.style.width = `${compactTextWidth}px`;
    const expanded =
      textarea.value.includes("\n") || measurement.scrollHeight > 24;
    measurement.style.width = `${expanded ? shell.clientWidth - 40 : compactTextWidth}px`;
    const textHeight = Math.min(
      192,
      Math.max(24, measurement.scrollHeight),
    );

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
    measurePrompt();
  };

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
    if (useChatStore.getState().isLoading) return;
    const existing = [
      ...useChatStore.getState().getActiveAttachments(),
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
      <div ref={shellRef} className="relative mx-auto max-w-2xl">
        <div
          className={cn(
            "relative overflow-hidden border border-input bg-background p-2 shadow-xs",
            layout.expanded ? "rounded-2xl pb-12" : "rounded-xl",
            layout.animate &&
              "transition-[border-radius,padding-bottom] duration-200 ease-out",
            isLoading && "chat-prompt-generating",
          )}
        >
          {hasHeader && (
            <div className="-mx-2 -mt-2 mb-2 flex flex-col items-stretch gap-2 overflow-hidden rounded-t-xl border-b bg-muted/50 px-2.5 pt-2 pb-2.5">
              {selectionContext && (
                <div className="flex w-full animate-in items-start gap-3 duration-200 fade-in-0">
                  <CornerDownLeftIcon className="mt-0.5 size-4 shrink-0 -scale-x-100" />
                  <span className="line-clamp-3 min-w-0 flex-1 text-sm leading-relaxed font-normal text-foreground">
                    "<SelectionQuote text={selectionContext} />"
                  </span>
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Ta bort citatet"
                    onClick={onClearSelectionContext}
                  >
                    <XIcon />
                  </InputGroupButton>
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
                      <InputGroupButton
                        size="icon-xs"
                        aria-label={`Ta bort ${a.name}`}
                        onClick={() => removeAttachment(a.id)}
                      >
                        <XIcon />
                      </InputGroupButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            defaultValue={initialText}
            rows={1}
            placeholder="Fråga vad som helst"
            aria-label="Meddelande"
            className={cn(
              "block max-h-50 w-full resize-none overflow-y-auto border-0 bg-transparent py-1 text-[0.9375rem] leading-6 text-foreground outline-none placeholder:text-muted-foreground",
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
              measurePrompt();
            }}
            onKeyDown={onKeyDown}
          />

          <div
            ref={leftControlsRef}
            className="absolute bottom-2 left-2 flex h-8 items-center gap-0.5"
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
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupButton
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-full"
                  aria-label="Bifoga filer"
                  disabled={isLoading || capacityReached}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PlusIcon />
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent>Bifoga filer</TooltipContent>
            </Tooltip>
          </div>

          <div
            ref={rightControlsRef}
            className="absolute right-2 bottom-2 flex h-8 shrink-0 items-center gap-1"
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
            <InputGroupButton
              variant="default"
              size="icon-sm"
              className="rounded-full"
              aria-label={isLoading ? "Avbryt svar" : "Skicka meddelande"}
              disabled={!isLoading && !canSend}
              onClick={() => (isLoading ? onCancel() : submit())}
            >
              {isLoading ? (
                <span className="size-2.5 rounded-xs bg-current" aria-hidden />
              ) : (
                <ArrowUpIcon />
              )}
            </InputGroupButton>
          </div>
        </div>

        <textarea
          ref={measurementRef}
          aria-hidden="true"
          tabIndex={-1}
          rows={1}
          className="pointer-events-none absolute h-0 overflow-hidden border-0 p-0 text-[0.9375rem] leading-6 whitespace-pre-wrap invisible"
        />
      </div>
      <p className="mt-2 text-center text-2xs text-muted-foreground">
        AI kan göra misstag. Kontrollera svar.
      </p>
    </form>
  );
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
        <InputGroupButton variant="ghost" aria-label="Tankenivå">
          {label}
          <ChevronDownIcon />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={selectedModelId}
          onValueChange={(v) => setSelectedModelId(v as ChatModelId)}
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
