import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { createMessageId, type Message } from "@/stores/chat";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  /** "TATA24 · Tenta 2026-08-21", when known. */
  meta: string;
}

/** Course and exam labels come from the first chat log of each conversation. */
async function loadMeta(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  try {
    const { data: logs, error } = await supabase
      .from("ai_chat_logs")
      .select("conversation_id, course_code, exam_id, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const first = new Map<string, { courseCode: string | null; examId: number | null }>();
    for (const row of logs ?? []) {
      if (!row?.conversation_id || first.has(row.conversation_id)) continue;
      first.set(row.conversation_id, {
        courseCode: row.course_code || null,
        examId: typeof row.exam_id === "number" ? row.exam_id : null,
      });
    }

    const examIds = [...new Set([...first.values()].map((m) => m.examId).filter((id): id is number => id !== null))];
    const dateById = new Map<number, string>();
    if (examIds.length) {
      const { data: exams } = await supabase.from("exams").select("id, exam_date").in("id", examIds);
      for (const e of exams ?? []) if (e?.id && e?.exam_date) dateById.set(e.id, e.exam_date);
    }

    const meta: Record<string, string> = {};
    for (const [id, m] of first) {
      const parts = [m.courseCode, m.examId !== null && dateById.get(m.examId) ? `Tenta ${dateById.get(m.examId)}` : null];
      meta[id] = parts.filter(Boolean).join(" · ");
    }
    return meta;
  } catch {
    // Metadata is decoration; the list works without it.
    return {};
  }
}

export const conversationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["conversations", userId],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []).filter((row) => row?.id && row?.created_at);
      const meta = await loadMeta(rows.map((r) => r.id));
      return rows.map((row) => ({
        id: row.id,
        title: row.title || "Ny chatt",
        createdAt: row.created_at,
        meta: meta[row.id] ?? "",
      }));
    },
  });

/** Saved turns of a conversation, normalised to user/assistant messages. */
export async function loadConversationMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("ai_chat_logs")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).flatMap((row): Message[] => {
    const role = String(row?.role ?? "").trim().toLowerCase();
    const normalized = ["user", "human"].includes(role)
      ? "user"
      : ["assistant", "ai", "bot", "model"].includes(role)
        ? "assistant"
        : null;
    if (!normalized || typeof row?.content !== "string") return [];
    return [{ id: createMessageId(), role: normalized, content: row.content }];
  });
}

export async function deleteConversations(userId: string, ids: string[]) {
  if (!ids.length) return;
  const { error: logsError } = await supabase.from("ai_chat_logs").delete().in("conversation_id", ids);
  if (logsError) throw logsError;
  const { error } = await supabase.from("conversations").delete().in("id", ids).eq("user_id", userId);
  if (error) throw error;
}
