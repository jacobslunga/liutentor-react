import { useCallback, useEffect, useRef } from "react";
import {
  AI_API_BASE,
  CHAT_COMPLETION_URL,
  getAnonymousId,
  LEARN_COMPLETION_URL,
  readSseEvents,
} from "@/lib/chat-api";
import { DEFAULT_MODEL_ID } from "@/lib/chat-models";
import { conversationCourses } from "@/lib/course-mentions";
import {
  createLocalConversationId,
  isLocalConversationId,
  loadLocalConversationMessages,
  saveLocalConversation,
} from "@/lib/local-conversations";
import { queryClient } from "@/lib/query-client";
import { getAuthHeaders, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import {
  createMessageId,
  useChatStoreApi,
  type ChatAttachment,
  type ChatStore,
  type Message,
  type MessageSource,
} from "@/stores/chat";
import {
  conversationsKey,
  type Conversation,
  type ConversationKind,
} from "@/queries/conversations";
import { useCourseCodes } from "@/queries/exams";

const CANCELLED_NOTE = "> *Avbruten av användaren*";
const GENERIC_ERROR = "Något gick fel. Försök igen senare.";

function truncateTitle(title: string, maxLength: number): string {
  return title.length <= maxLength
    ? title
    : `${title.slice(0, maxLength - 1).trimEnd()}…`;
}

function persistLocalConversation(store: ChatStore, transport: ChatTransport) {
  const { currentConversationId, currentConversationTitle, messages } =
    store.getState();
  if (!isLocalConversationId(currentConversationId)) return;
  saveLocalConversation(
    currentConversationId,
    currentConversationTitle || "Ny chatt",
    transport.meta,
    messages,
    transport.kind,
  );
  void queryClient.invalidateQueries({ queryKey: ["conversations", "local"] });
}

async function cancelTurnOnServer(turnId: string) {
  try {
    await fetch(`${AI_API_BASE}/chat/turns/${turnId}/cancel`, {
      method: "POST",
      headers: {
        "x-anonymous-user-id": getAnonymousId(),
        ...(await getAuthHeaders()),
      },
    });
  } catch {}
}

export interface ChatTransport {
  kind: ConversationKind;
  url: string;

  payload: Record<string, unknown>;

  meta: string;

  courseId?: string | null;
}

export interface ChatContext {
  examId: string;
  examUrl: string;
  courseCode: string;
  solutionUrl?: string | null;
}

export interface SendOptions {
  modelId?: string;
  selectionContext?: string;
}

export interface CancelledTurn {
  content: string;
  attachments: ChatAttachment[];
}

export function useExamChat(ctx: ChatContext) {
  const store = useChatStoreApi();
  return useChat(store, () => ({
    kind: "exam",
    url: `${CHAT_COMPLETION_URL}/${ctx.examId}`,
    payload: {
      examUrl: ctx.examUrl,
      courseCode: ctx.courseCode,
      solutionUrl: ctx.solutionUrl || undefined,
    },
    meta: ctx.courseCode,
  }));
}

export function useLearnChat() {
  const store = useChatStoreApi();
  const { nameByCode } = useCourseCodes();
  return useChat(store, (messages) => {
    const courses = conversationCourses(messages, nameByCode);
    const courseId = store.getState().currentCourseId;
    return {
      kind: "learn",
      courseId,
      url: LEARN_COMPLETION_URL,
      payload: {
        ...(courses.length ? { courses } : {}),
        ...(courseId ? { courseId } : {}),
      },
      meta: courses.map((c) => c.code).join(", "),
    };
  });
}

export function useChat(
  store: ChatStore,
  transport: (messages: Message[]) => ChatTransport,
) {
  const abortRef = useRef<AbortController | null>(null);

  const turnIdRef = useRef<string | null>(null);
  const transportRef = useRef(transport);
  useEffect(() => {
    transportRef.current = transport;
  });
  const currentTransport = useCallback(
    () => transportRef.current(store.getState().messages),
    [store],
  );

  const cancelGeneration = useCallback((): CancelledTurn | null => {
    if (turnIdRef.current) void cancelTurnOnServer(turnIdRef.current);
    turnIdRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;

    const state = store.getState();
    const msgs = state.messages;
    const last = msgs.at(-1);
    let cancelled: CancelledTurn | null = null;
    let next = msgs;

    if (last?.role === "assistant") {
      if (!last.content.trim()) {
        const userMsg = msgs.at(-2);
        if (msgs.length === 2) {
          next = [...msgs.slice(0, -1), { ...last, content: CANCELLED_NOTE }];
        } else {
          if (userMsg?.role === "user") {
            cancelled = {
              content: userMsg.content,
              attachments: userMsg.attachments ?? [],
            };
          }
          next = msgs.slice(0, -2);
        }
      } else {
        next = [
          ...msgs.slice(0, -1),
          { ...last, content: `${last.content.trim()}\n\n${CANCELLED_NOTE}` },
        ];
      }
    }

    store.setState({
      messages: next.map((m) => (m.status ? { ...m, status: null } : m)),
      isLoading: false,
    });
    persistLocalConversation(store, currentTransport());
    return cancelled;
  }, [store, currentTransport]);

  const send = useCallback(
    async (
      content: string,
      attachments: ChatAttachment[] = [],
      opts: SendOptions = {},
    ) => {
      const state = store.getState();
      if ((!content.trim() && attachments.length === 0) || state.isLoading)
        return;

      const trimmed = content.trim();
      const isFirstMessage = state.messages.length === 0;
      const fallbackTitle = (max: number) =>
        truncateTitle(trimmed, max) ||
        (attachments[0]?.name
          ? truncateTitle(attachments[0].name, max)
          : "Ny chatt");

      if (!state.currentConversationTitle) {
        store.setState({
          currentConversationTitle: fallbackTitle(80),
          isConversationTitleReady: false,
          titleTypingStartedAt: null,
        });
      }

      const userId = useAuthStore.getState().user?.id;
      if (userId && !store.getState().currentConversationId) {
        const title = fallbackTitle(50);
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title,
            kind: currentTransport().kind,
            course_id: currentTransport().courseId ?? null,
          })
          .select("id")
          .single();
        if (error)
          console.error("Failed to initialize conversation history:", error);
        else {
          store.setState({
            currentConversationId: data.id,
            currentConversationTitle: title,
          });

          const { kind, meta, courseId } = currentTransport();
          queryClient.setQueryData<Conversation[]>(
            conversationsKey(userId, kind, courseId),
            (old) =>
              old && [
                {
                  id: data.id,
                  title,
                  createdAt: new Date().toISOString(),
                  meta,
                },
                ...old.filter((c) => c.id !== data.id),
              ],
          );
          void queryClient.invalidateQueries({
            queryKey: ["conversations", userId],
          });
        }
      } else if (!userId && !store.getState().currentConversationId) {
        store.setState({
          currentConversationId: createLocalConversationId(),
        });
      }

      const turnConversationId = store.getState().currentConversationId;
      const isShown = () =>
        store.getState().currentConversationId === turnConversationId;

      const userMessage: Message = {
        id: createMessageId(),
        role: "user",
        content,
        ...(opts.selectionContext
          ? { selectionContext: opts.selectionContext }
          : {}),
        ...(attachments.length ? { attachments } : {}),
      };
      const assistantId = createMessageId();
      store.setState((s) => ({
        messages: [
          ...s.messages,
          userMessage,
          { id: assistantId, role: "assistant", content: "" },
        ],
        isLoading: true,
      }));

      const controller = new AbortController();
      abortRef.current = controller;
      const turnId = crypto.randomUUID();
      turnIdRef.current = turnId;
      const transportAtSend = currentTransport();

      persistLocalConversation(store, transportAtSend);

      const turnMessages = store.getState().messages;
      let turnReply: Partial<Message> = {};
      let turnTitle = store.getState().currentConversationTitle || "Ny chatt";

      let streamText = "";
      let pendingFrame = 0;
      const patch = (p: Partial<Message>) => {
        turnReply = { ...turnReply, ...p };
        if (isShown()) store.getState().updateMessage(assistantId, p);
      };

      const persistTurn = () => {
        if (!isLocalConversationId(turnConversationId)) return;
        const final = turnMessages.map((m) =>
          m.id === assistantId ? { ...m, ...turnReply, status: null } : m,
        );
        saveLocalConversation(
          turnConversationId,
          turnTitle,
          transportAtSend.meta,
          final,
          transportAtSend.kind,
        );
        void queryClient.invalidateQueries({
          queryKey: ["conversations", "local"],
        });

        const shown = store.getState().messages;
        if (
          isShown() &&
          !shown.some((m) => m.id === assistantId) &&
          shown.length === final.length - 1
        ) {
          store.setState({
            messages: loadLocalConversationMessages(turnConversationId),
          });
        }
      };
      const cancelFlush = () => {
        if (pendingFrame) cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
      };
      const flush = () => {
        pendingFrame = 0;
        if (!controller.signal.aborted) patch({ content: streamText });
      };

      try {
        const history = store
          .getState()
          .messages.slice(0, -1)
          .slice(-20)
          .map((m) => ({
            role: m.role,
            content:
              m.role === "user" && !m.content.trim() && m.attachments?.length
                ? "Jag bifogade material till den här frågan."
                : m.content,
            ...(m.context ? { context: m.context } : {}),
          }));

        const formData = new FormData();
        formData.append(
          "payload",
          JSON.stringify({
            ...transportAtSend.payload,
            messages: history,
            modelId: opts.modelId || DEFAULT_MODEL_ID,

            conversationId: isLocalConversationId(
              store.getState().currentConversationId,
            )
              ? undefined
              : store.getState().currentConversationId,
            isFirstMessage,
            selectionContext: opts.selectionContext || undefined,
            turnId,
          }),
        );

        for (const attachment of store.getState().getActiveAttachments()) {
          if (attachment.file)
            formData.append("files", attachment.file, attachment.name);
        }

        const response = await fetch(transportAtSend.url, {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "x-anonymous-user-id": getAnonymousId(),
            ...(await getAuthHeaders()),
          },
          body: formData,
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("API error");

        let failed = false;
        for await (const { event, data } of readSseEvents(response.body)) {
          const payload = data as {
            delta?: string;
            step?: string;
            message?: string;
            items?: MessageSource[];
            title?: string;
          };
          if (event === "text") {
            streamText += payload.delta ?? "";
            if (!pendingFrame) pendingFrame = requestAnimationFrame(flush);
          } else if (event === "status") {
            patch({
              status:
                payload.step === "search_done"
                  ? null
                  : {
                      step: payload.step ?? "",
                      message: payload.message ?? "",
                    },
            });
          } else if (event === "sources") {
            patch({ sources: payload.items ?? [] });
          } else if (event === "title" && payload.title?.trim()) {
            const title = payload.title.trim();
            turnTitle = title;
            if (isShown()) {
              store.setState({
                currentConversationTitle: title,
                isConversationTitleReady: true,
                titleTypingStartedAt: performance.now(),
                titleTypesInSidebar: true,
              });
            }
            const id = turnConversationId;

            queryClient.setQueriesData<Conversation[]>(
              { queryKey: ["conversations"] },
              (old) => old?.map((c) => (c.id === id ? { ...c, title } : c)),
            );
          } else if (event === "done") {
            patch({ status: null });
          } else if (event === "error") {
            failed = true;
            patch({ status: null });
          }
        }

        cancelFlush();
        patch({
          content:
            streamText.trim() ||
            (failed ? GENERIC_ERROR : "Jag kunde inte generera ett svar."),
        });
      } catch (error) {
        cancelFlush();
        if (error instanceof Error && error.name === "AbortError") return;
        patch({ content: GENERIC_ERROR });
      } finally {
        cancelFlush();
        if (abortRef.current === controller) abortRef.current = null;
        if (turnIdRef.current === turnId) turnIdRef.current = null;
        if (!controller.signal.aborted) {
          patch({ status: null });
          if (isShown()) store.getState().setLoading(false);
          persistTurn();
        }
      }
    },
    [store, currentTransport],
  );

  return { send, cancelGeneration };
}
