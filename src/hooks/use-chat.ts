import { useCallback, useEffect, useRef } from "react";
import {
  CHAT_COMPLETION_URL,
  getAnonymousId,
  readSseEvents,
} from "@/lib/chat-api";
import { DEFAULT_MODEL_ID } from "@/lib/chat-models";
import {
  createLocalConversationId,
  isLocalConversationId,
  saveLocalConversation,
} from "@/lib/local-conversations";
import { queryClient } from "@/lib/query-client";
import { getAuthHeaders, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import {
  createMessageId,
  useChatStore,
  type ChatAttachment,
  type Message,
  type MessageSource,
} from "@/stores/chat";

const CANCELLED_NOTE = "> *Avbruten av användaren*";
const GENERIC_ERROR = "Något gick fel. Försök igen senare.";

function truncateTitle(title: string, maxLength: number): string {
  return title.length <= maxLength
    ? title
    : `${title.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Signed-out chats live in this browser; write the current one back. */
function persistLocalConversation(courseCode: string) {
  const { currentConversationId, currentConversationTitle, messages } =
    useChatStore.getState();
  if (!isLocalConversationId(currentConversationId)) return;
  saveLocalConversation(
    currentConversationId,
    currentConversationTitle || "Ny chatt",
    courseCode,
    messages,
  );
  void queryClient.invalidateQueries({ queryKey: ["conversations", "local"] });
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

/**
 * Sends chat turns to the AI service and streams the reply into the chat
 * store. Text deltas are flushed at most once per animation frame, and only
 * the streaming assistant message is replaced, so earlier rows never re-render.
 */
export function useChat(ctx: ChatContext) {
  const abortRef = useRef<AbortController | null>(null);
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  });

  useEffect(() => () => abortRef.current?.abort(), []);

  const cancelGeneration = useCallback((): CancelledTurn | null => {
    abortRef.current?.abort();
    abortRef.current = null;

    const store = useChatStore.getState();
    const msgs = store.messages;
    const last = msgs.at(-1);
    let cancelled: CancelledTurn | null = null;
    let next = msgs;

    if (last?.role === "assistant") {
      if (!last.content.trim()) {
        const userMsg = msgs.at(-2);
        if (msgs.length === 2) {
          // First turn: keep the question visible, note the cancellation.
          next = [...msgs.slice(0, -1), { ...last, content: CANCELLED_NOTE }];
        } else {
          // Later turn: drop it and hand the question back to the input.
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

    useChatStore.setState({
      messages: next.map((m) => (m.status ? { ...m, status: null } : m)),
      isLoading: false,
    });
    persistLocalConversation(ctxRef.current.courseCode);
    return cancelled;
  }, []);

  const send = useCallback(
    async (
      content: string,
      attachments: ChatAttachment[] = [],
      opts: SendOptions = {},
    ) => {
      const store = useChatStore.getState();
      if ((!content.trim() && attachments.length === 0) || store.isLoading)
        return;

      const { examId, examUrl, courseCode, solutionUrl } = ctxRef.current;
      const trimmed = content.trim();
      const isFirstMessage = store.messages.length === 0;
      const fallbackTitle = (max: number) =>
        truncateTitle(trimmed, max) ||
        (attachments[0]?.name
          ? truncateTitle(attachments[0].name, max)
          : "Ny chatt");

      if (!store.currentConversationTitle) {
        useChatStore.setState({
          currentConversationTitle: fallbackTitle(80),
          isConversationTitleReady: false,
          animateConversationTitle: false,
        });
      }

      // Signed-in users get a conversation row so the turn lands in history.
      const userId = useAuthStore.getState().user?.id;
      if (userId && !useChatStore.getState().currentConversationId) {
        const title = fallbackTitle(50);
        const { data, error } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title })
          .select("id")
          .single();
        if (error)
          console.error("Failed to initialize conversation history:", error);
        else
          useChatStore.setState({
            currentConversationId: data.id,
            currentConversationTitle: title,
          });
      } else if (!userId && !useChatStore.getState().currentConversationId) {
        useChatStore.setState({
          currentConversationId: createLocalConversationId(),
        });
      }

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
      useChatStore.setState((s) => ({
        messages: [
          ...s.messages,
          userMessage,
          { id: assistantId, role: "assistant", content: "" },
        ],
        isLoading: true,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      let streamText = "";
      let pendingFrame = 0;
      const patch = (p: Partial<Message>) =>
        useChatStore.getState().updateMessage(assistantId, p);
      const cancelFlush = () => {
        if (pendingFrame) cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
      };
      const flush = () => {
        pendingFrame = 0;
        if (!controller.signal.aborted) patch({ content: streamText });
      };

      try {
        const history = useChatStore
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
            messages: history,
            examUrl,
            courseCode,
            solutionUrl: solutionUrl || undefined,
            modelId: opts.modelId || DEFAULT_MODEL_ID,
            // Local ids never leave the browser; the server only knows its own.
            conversationId: isLocalConversationId(
              useChatStore.getState().currentConversationId,
            )
              ? undefined
              : useChatStore.getState().currentConversationId,
            isFirstMessage,
            selectionContext: opts.selectionContext || undefined,
          }),
        );
        // Includes this turn's files: the user message is already in the store.
        for (const attachment of useChatStore
          .getState()
          .getActiveAttachments()) {
          if (attachment.file)
            formData.append("files", attachment.file, attachment.name);
        }

        const response = await fetch(`${CHAT_COMPLETION_URL}/${examId}`, {
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
            useChatStore.setState({
              currentConversationTitle: payload.title.trim(),
              isConversationTitleReady: true,
              animateConversationTitle: true,
            });
            if (userId) {
              void queryClient.invalidateQueries({
                queryKey: ["conversations", userId],
              });
            }
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
        if (!controller.signal.aborted) {
          patch({ status: null });
          useChatStore.getState().setLoading(false);
          persistLocalConversation(courseCode);
        }
      }
    },
    [],
  );

  return { send, cancelGeneration };
}
