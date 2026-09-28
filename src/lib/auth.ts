import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { examChatStore, learnChatStore } from "@/stores/chat";

export async function signOut() {
  examChatStore.getState().resetOnLogout();
  learnChatStore.getState().resetOnLogout();
  await supabase.auth.signOut();
  queryClient.removeQueries({ queryKey: ["profile"] });
  queryClient.removeQueries({ queryKey: ["activity"] });
}
