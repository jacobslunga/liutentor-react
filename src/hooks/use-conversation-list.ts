import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  deleteLocalConversations,
  isLocalConversationId,
  loadLocalConversationMessages,
  loadLocalConversationTitle,
} from "@/lib/local-conversations";
import {
  conversationsQuery,
  deleteConversations,
  loadConversationMessages,
  loadConversationTitle,
  localConversationsQuery,
  type Conversation,
  type ConversationKind,
} from "@/queries/conversations";
import { useUser } from "@/stores/auth";
import type { Message } from "@/stores/chat";

export const CONVERSATION_GROUPS = [
  "Idag",
  "Igår",
  "Denna veckan",
  "Denna månaden",
  "Äldre",
] as const;

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function groupLabel(value: string): (typeof CONVERSATION_GROUPS)[number] {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return "Idag";
  if (sameDay(date, yesterday)) return "Igår";

  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  if (date >= weekStart) return "Denna veckan";
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
    return "Denna månaden";
  return "Äldre";
}

/** Newest-first conversations bucketed by age, empty groups dropped. */
export function groupConversations(conversations: Conversation[]) {
  const byGroup = new Map<string, Conversation[]>();
  for (const c of conversations) {
    const label = groupLabel(c.createdAt);
    byGroup.set(label, [...(byGroup.get(label) ?? []), c]);
  }
  return CONVERSATION_GROUPS.map((label) => ({
    label,
    items: byGroup.get(label) ?? [],
  })).filter((g) => g.items.length);
}

/** Saved turns of a conversation, from the server or this browser. */
export function loadMessages(id: string): Promise<Message[]> {
  return isLocalConversationId(id)
    ? Promise.resolve(loadLocalConversationMessages(id))
    : loadConversationMessages(id);
}

/** Title and turns of a saved conversation; null when it does not exist. */
export async function loadConversation(
  id: string,
): Promise<{ title: string; messages: Message[] } | null> {
  if (isLocalConversationId(id)) {
    const title = loadLocalConversationTitle(id);
    return title === null
      ? null
      : { title, messages: loadLocalConversationMessages(id) };
  }
  const [title, messages] = await Promise.all([
    loadConversationTitle(id),
    loadConversationMessages(id),
  ]);
  return title === null ? null : { title, messages };
}

/**
 * Saved conversations of one kind: from the server when signed in, from this
 * browser otherwise.
 */
export function useConversationList(
  kind: ConversationKind,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const user = useUser();
  const queryClient = useQueryClient();
  const historyQuery = user
    ? conversationsQuery(user.id, kind)
    : localConversationsQuery(kind);
  const {
    data: conversations = [],
    isPending,
    isError,
  } = useQuery({ ...historyQuery, enabled });

  const groups = useMemo(
    () => groupConversations(conversations),
    [conversations],
  );

  async function remove(ids: string[]) {
    if (user) await deleteConversations(user.id, ids);
    else deleteLocalConversations(ids);
    queryClient.setQueryData<Conversation[]>(historyQuery.queryKey, (old) =>
      old?.filter((c) => !ids.includes(c.id)),
    );
  }

  return {
    conversations,
    groups,
    isPending,
    isError,
    isSignedIn: !!user,
    remove,
  };
}
