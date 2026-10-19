import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
    queryFn: async ({ signal }): Promise<Profile | null> => {
      const controller = new AbortController();
      const requestSignal = AbortSignal.any([signal, controller.signal]);
      const load = () =>
        supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url, avatar_color")
          .eq("id", userId)
          .abortSignal(requestSignal)
          .single();

      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        // Bound the entire operation, including waiting for auth/token refresh.
        return await Promise.race([
          (async () => {
            let result = await load();
            if (result.status === 401 && !requestSignal.aborted) {
              const { error } = await supabase.auth.refreshSession();
              if (error) throw error;
              if (requestSignal.aborted) throw requestSignal.reason;
              result = await load();
            }
            if (result.error) throw result.error;
            return result.data as Profile | null;
          })(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              const error = new Error("Profile request timed out");
              controller.abort(error);
              reject(error);
            }, 15_000);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
    },
    staleTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
        supabase
          .from("ai_quiz_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("conversations")
          .select("id", { count: "exact" })
          .eq("user_id", userId),
      ]);

      const conversationIds = (conversationsRes.data ?? []).map(
        (row: { id: string }) => row.id,
      );
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
    isError: query.isError,
    isFetching: query.isFetching,
    retry: query.refetch,
    firstName,
    lastName,
    displayName: [firstName, lastName].filter(Boolean).join(" "),
    initials: initials.toUpperCase(),
    avatarColor: profile?.avatar_color ?? localColor,
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id);
      if (error) throw error;
      return patch;
    },
    onSuccess: (patch) => {
      if (!user) return;
      queryClient.setQueryData<Profile | null>(
        profileQuery(user.id).queryKey,
        (old) => (old ? { ...old, ...patch } : old),
      );
    },
  });
}
