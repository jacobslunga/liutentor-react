import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";

export interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
}

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url, avatar_color")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as Profile | null;
    },
    staleTime: 5 * 60_000,
  });

export interface Activity {
  quizCount: number;
  conversationCount: number;
  chatMessageCount: number;
}

export const activityQuery = (userId: string) =>
  queryOptions({
    queryKey: ["activity", userId],
    queryFn: async (): Promise<Activity> => {
      const [quizRes, conversationsRes] = await Promise.all([
        supabase.from("ai_quiz_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("conversations").select("id", { count: "exact" }).eq("user_id", userId),
      ]);

      const conversationIds = (conversationsRes.data ?? []).map((row: { id: string }) => row.id);
      let chatMessageCount = 0;
      if (conversationIds.length) {
        const logs = await supabase
          .from("ai_chat_logs")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", conversationIds);
        chatMessageCount = logs.count ?? 0;
      }

      return {
        quizCount: quizRes.count ?? 0,
        conversationCount: conversationsRes.count ?? 0,
        chatMessageCount,
      };
    },
  });

/** The signed-in user's profile plus display helpers. */
export function useProfile() {
  const user = useUser();
  const localColor = useSettingsStore((s) => s.avatarColor);
  const query = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const profile = query.data;

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const initials =
    (firstName[0] ?? "") + (lastName[0] ?? "") || user?.email?.[0] || "?";

  return {
    user,
    profile,
    isPending: !!user && query.isPending,
    firstName,
    lastName,
    displayName: [firstName, lastName].filter(Boolean).join(" "),
    initials: initials.toUpperCase(),
    avatarColor: profile?.avatar_color ?? localColor,
  };
}

/** Updates columns on the signed-in user's profile and patches the cached copy. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
      return patch;
    },
    onSuccess: (patch) => {
      if (!user) return;
      queryClient.setQueryData<Profile | null>(profileQuery(user.id).queryKey, (old) =>
        old ? { ...old, ...patch } : old,
      );
    },
  });
}
