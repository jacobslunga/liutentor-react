import { create } from "zustand";

export interface MessageSource {
  title: string;
  url: string;
}

export interface MessageStatus {
  step: string;
  message: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  lastModified: number;
  active: boolean;
  file?: File;
  previewUrl?: string;
}

export interface Message {
  /** Stable client id so rows can be memoized while the last one streams. */
  id: string;
  role: "user" | "assistant";
  content: string;
  context?: string;
  selectionContext?: string;
  attachments?: ChatAttachment[];
  /**
   * What the assistant is doing right now, e.g. searching the web. Live only
   * for the turn being streamed; reloaded history never carries it.
   */
  status?: MessageStatus | null;
  sources?: MessageSource[];
}

export interface PendingSelection {
  prompt: string;
  context: string;
}

interface ChatState {
  isOpen: boolean;
  isLoading: boolean;
  isHistoryOpen: boolean;
  messages: Message[];
  savedScrollPosition: number | null;
  draftInput: string;
  draftAttachments: ChatAttachment[];
  currentExamId: string | null;
  currentConversationId: string | null;
  currentConversationTitle: string | null;
  pendingSelection: PendingSelection | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setLoading: (value: boolean) => void;
  setHistoryOpen: (value: boolean) => void;
  askAboutSelection: (prompt: string, context: string) => void;
  takePendingSelection: () => PendingSelection | null;
  /** Replace one message (by id) with a patched copy. */
  updateMessage: (id: string, patch: Partial<Message>) => void;
  getActiveAttachments: () => ChatAttachment[];
  deactivateAttachment: (id: string) => void;
  clearChat: () => void;
  resetOnLogout: () => void;
}

let nextMessageId = 0;
export const createMessageId = () => `m${Date.now().toString(36)}-${nextMessageId++}`;

function revokePreviews(attachments: ChatAttachment[]) {
  const urls = new Set(attachments.map((a) => a.previewUrl).filter((u): u is string => !!u));
  for (const url of urls) URL.revokeObjectURL(url);
}

/**
 * Chat state. Components must select the slice they need: the streaming reply
 * replaces the last message every frame, and anything subscribed to
 * `messages` re-renders with it.
 */
export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  isHistoryOpen: false,
  messages: [],
  savedScrollPosition: null,
  draftInput: "",
  draftAttachments: [],
  currentExamId: null,
  currentConversationId: null,
  currentConversationTitle: null,
  pendingSelection: null,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setLoading: (isLoading) => set({ isLoading }),
  setHistoryOpen: (isHistoryOpen) => set({ isHistoryOpen }),

  askAboutSelection: (prompt, context) =>
    set({ pendingSelection: { prompt, context }, isOpen: true }),

  takePendingSelection: () => {
    const pending = get().pendingSelection;
    if (pending) set({ pendingSelection: null });
    return pending;
  },

  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  getActiveAttachments: () =>
    get().messages.flatMap((m) => (m.attachments ?? []).filter((a) => a.active && a.file)),

  deactivateAttachment: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        const attachment = m.attachments?.find((a) => a.id === id);
        if (!attachment) return m;
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        return {
          ...m,
          attachments: m.attachments!.map((a) =>
            a.id === id ? { ...a, active: false, file: undefined, previewUrl: undefined } : a,
          ),
        };
      }),
    })),

  clearChat: () => {
    const { messages, draftAttachments } = get();
    revokePreviews(messages.flatMap((m) => m.attachments ?? []));
    revokePreviews(draftAttachments);
    set({
      messages: [],
      isLoading: false,
      savedScrollPosition: null,
      draftInput: "",
      draftAttachments: [],
      currentExamId: null,
      currentConversationId: null,
      currentConversationTitle: null,
      isHistoryOpen: false,
      pendingSelection: null,
    });
  },

  resetOnLogout: () => {
    get().clearChat();
    set({ isOpen: false });
  },
}));
