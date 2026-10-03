import { createContext, useContext } from "react";
import { create, useStore } from "zustand";


export type MessageSource =
  | { type?: "web"; title: string; url: string }
  | { type: "file"; title: string; fileId: string };

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

  id: string;
  role: "user" | "assistant";
  content: string;
  context?: string;
  selectionContext?: string;
  attachments?: ChatAttachment[];




  status?: MessageStatus | null;
  sources?: MessageSource[];

  createdAt?: string;
}

export interface PendingSelection {
  prompt: string;
  context: string;
}

export interface ChatState {
  isOpen: boolean;
  isLoading: boolean;
  isHistoryOpen: boolean;
  messages: Message[];
  savedScrollPosition: number | null;
  draftInput: string;
  draftAttachments: ChatAttachment[];
  currentExamId: string | null;
  currentConversationId: string | null;

  currentCourseId: string | null;
  currentConversationTitle: string | null;
  isConversationTitleReady: boolean;




  titleTypingStartedAt: number | null;




  titleTypesInSidebar: boolean;
  pendingSelection: PendingSelection | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setLoading: (value: boolean) => void;
  setHistoryOpen: (value: boolean) => void;
  askAboutSelection: (prompt: string, context: string) => void;
  takePendingSelection: () => PendingSelection | null;

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









export const createChatStore = () =>
  create<ChatState>((set, get) => ({
    isOpen: false,
    isLoading: false,
    isHistoryOpen: false,
    messages: [],
    savedScrollPosition: null,
    draftInput: "",
    draftAttachments: [],
    currentExamId: null,
    currentConversationId: null,
    currentCourseId: null,
    currentConversationTitle: null,
    isConversationTitleReady: false,
    titleTypingStartedAt: null,
    titleTypesInSidebar: false,
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
        currentCourseId: null,
        currentConversationTitle: null,
        isConversationTitleReady: false,
        titleTypingStartedAt: null,
        titleTypesInSidebar: false,
        isHistoryOpen: false,
        pendingSelection: null,
      });
    },

    resetOnLogout: () => {
      get().clearChat();
      set({ isOpen: false });
    },
  }));

export type ChatStore = ReturnType<typeof createChatStore>;


export const examChatStore = createChatStore();

export const learnChatStore = createChatStore();


export const ChatStoreContext = createContext<ChatStore>(examChatStore);

export const useChatStoreApi = () => useContext(ChatStoreContext);

export function useChatStore<T>(selector: (state: ChatState) => T): T {
  return useStore(useChatStoreApi(), selector);
}
