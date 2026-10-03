import type { Conversation, ConversationKind } from "@/queries/conversations";
import { createMessageId, type Message } from "@/stores/chat";





const STORAGE_KEY = "liutentor_conversations_v1";
const LOCAL_PREFIX = "local:";
const MAX_CONVERSATIONS = 50;

type StoredMessage = Pick<Message, "role" | "content" | "context" | "selectionContext" | "sources" | "attachments">;

interface StoredConversation extends Conversation {

  kind?: ConversationKind;
  messages: StoredMessage[];
}

export const isLocalConversationId = (id: string | null | undefined): id is string =>
  !!id?.startsWith(LOCAL_PREFIX);

export const createLocalConversationId = () => `${LOCAL_PREFIX}${crypto.randomUUID()}`;

function readAll(): StoredConversation[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


function writeAll(conversations: StoredConversation[]) {
  let kept = conversations.slice(0, MAX_CONVERSATIONS);
  while (kept.length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
      return;
    } catch {
      kept = kept.slice(0, -1);
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {

  }
}

export function listLocalConversations(kind: ConversationKind): Conversation[] {
  return readAll()
    .filter((c) => (c.kind ?? "exam") === kind)
    .map(({ id, title, createdAt, meta }) => ({ id, title, createdAt, meta }));
}

export function loadLocalConversationTitle(id: string): string | null {
  return readAll().find((c) => c.id === id)?.title ?? null;
}

export function loadLocalConversationMessages(id: string): Message[] {
  const stored = readAll().find((c) => c.id === id);
  return (stored?.messages ?? []).map((m) => ({ ...m, id: createMessageId() }));
}

export function saveLocalConversation(
  id: string,
  title: string,
  meta: string,
  messages: Message[],
  kind: ConversationKind,
) {
  const persisted = messages
    .filter((m) => m.content.trim() || m.attachments?.length)
    .map(
      ({ role, content, context, selectionContext, sources, attachments }): StoredMessage => ({
        role,
        content,
        ...(context ? { context } : {}),
        ...(selectionContext ? { selectionContext } : {}),
        ...(sources?.length ? { sources } : {}),

        ...(attachments?.length
          ? {
              attachments: attachments.map(({ id, name, mediaType, size, lastModified }) => ({
                id,
                name,
                mediaType,
                size,
                lastModified,
                active: false,
              })),
            }
          : {}),
      }),
    );
  if (!persisted.length) return;

  const all = readAll();
  const existing = all.find((c) => c.id === id);
  const next: StoredConversation = {
    id,
    title,
    kind,
    meta: existing?.meta || meta,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    messages: persisted,
  };
  writeAll([next, ...all.filter((c) => c.id !== id)]);
}

export function deleteLocalConversations(ids: string[]) {
  writeAll(readAll().filter((c) => !ids.includes(c.id)));
}
