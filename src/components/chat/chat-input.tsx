import { ArrowUpIcon, ChevronDownIcon, CornerDownLeftIcon, FileTextIcon, ImageIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
/** The counter appears from here, so typing below it never re-renders. */
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
  onSend: () => void;
  onCancel: () => void;
  onClearSelectionContext: () => void;
}

/**
 * The prompt. The textarea is uncontrolled: keystrokes never touch React
 * state or the store, only a "has text" flag and the counter near the limit.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>(() =>
    initialAttachments.filter((a) => a.active && a.file),
  );
  const [hasText, setHasText] = useState(!!initialText.trim());
  const [longLength, setLongLength] = useState(0);
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const syncTextState = (value: string) => {
    setHasText(!!value.trim());
    setLongLength(value.length >= COUNTER_FROM ? value.length : 0);
  };

  const setText = (value: string) => {
    if (textareaRef.current) textareaRef.current.value = value;
    syncTextState(value);
  };

  const addFiles = (files: File[]) => {
    if (useChatStore.getState().isLoading) return;
    const existing = [...useChatStore.getState().getActiveAttachments(), ...attachmentsRef.current];
    const { accepted, errors } = acceptFiles(files, existing);
    if (accepted.length) setAttachments((current) => [...current, ...accepted]);
    for (const error of errors) toast.error(error);
  };

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getText: () => textareaRef.current?.value ?? "",
    setText,
    getAttachments: () => [...attachmentsRef.current],
    setAttachments: (value) => setAttachments(value.filter((a) => a.active && a.file)),
    clearAttachments: () => setAttachments([]),
    discardAttachments: () => {
      for (const a of attachmentsRef.current) if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
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
  const activeBytes = useChatStore((s) => s.getActiveAttachments().reduce((sum, a) => sum + a.size, 0));
  const capacityReached =
    activeCount + attachments.length >= MAX_ATTACHMENTS ||
    activeBytes + attachments.reduce((sum, a) => sum + a.size, 0) >= MAX_ATTACHMENTS_TOTAL_SIZE;

  function submit() {
    if (canSend && !isLoading) onSend();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    // Enter sends; Shift+Enter keeps a newline.
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
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
      <InputGroup
        className={cn(
          "overflow-hidden rounded-2xl bg-background shadow-xs dark:bg-background",
          // InputGroup dims itself when anything inside is :disabled, which
          // includes the send button while the prompt is empty. Keep it opaque.
          "has-disabled:bg-background has-disabled:opacity-100 dark:has-disabled:bg-background",
          isLoading && "chat-prompt-generating",
        )}
      >
        {hasHeader && (
          <InputGroupAddon align="block-start" className="flex-col items-stretch gap-2 border-b bg-muted/50 pb-2">
            {selectionContext && (
              <div className="flex w-full animate-in items-start gap-3 duration-200 fade-in-0">
                <CornerDownLeftIcon className="mt-0.5 size-4 shrink-0 -scale-x-100" />
                <span className="line-clamp-3 min-w-0 flex-1 text-sm leading-relaxed font-normal text-foreground">
                  "<SelectionQuote text={selectionContext} />"
                </span>
                <InputGroupButton size="icon-xs" aria-label="Ta bort citatet" onClick={onClearSelectionContext}>
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
                      <img src={a.previewUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                    ) : (
                      <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="max-w-20 truncate" title={a.name}>
                      {a.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{formatFileSize(a.size)}</span>
                    <InputGroupButton size="icon-xs" aria-label={`Ta bort ${a.name}`} onClick={() => removeAttachment(a.id)}>
                      <XIcon />
                    </InputGroupButton>
                  </div>
                ))}
              </div>
            )}
          </InputGroupAddon>
        )}

        <InputGroupTextarea
          ref={textareaRef}
          defaultValue={initialText}
          rows={1}
          placeholder="Fråga vad som helst"
          aria-label="Meddelande"
          className="max-h-48 min-h-10 @3xl:min-h-14 @3xl:text-base"
          onInput={(e) => syncTextState(e.currentTarget.value)}
          onKeyDown={onKeyDown}
        />

        <InputGroupAddon align="block-end">
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
                size="icon-xs"
                variant="outline"
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

          <div className="ml-auto flex items-center gap-1">
            <ModelPicker />
            {longLength > 0 && (
              <span className={cn("text-2xs", tooLong ? "font-medium text-destructive" : "text-muted-foreground")}>
                {longLength} / {MAX_LENGTH}
              </span>
            )}
            <InputGroupButton
              variant="default"
              size="icon-xs"
              className="rounded-full"
              aria-label={isLoading ? "Avbryt svar" : "Skicka meddelande"}
              disabled={!isLoading && !canSend}
              onClick={() => (isLoading ? onCancel() : submit())}
            >
              {isLoading ? <span className="size-2.5 rounded-xs bg-current" aria-hidden /> : <ArrowUpIcon />}
            </InputGroupButton>
          </div>
        </InputGroupAddon>
      </InputGroup>
      <p className="mt-2 text-center text-2xs text-muted-foreground">AI kan göra misstag. Kontrollera svar.</p>
    </form>
  );
}

function ModelPicker() {
  const { selectedModelId, availableModels } = useSelectedModel();
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const label = availableModels.find((m) => m.id === selectedModelId)?.label ?? availableModels[0].label;

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
