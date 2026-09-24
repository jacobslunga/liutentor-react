import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { useChatStore } from "@/stores/chat";

export async function signOut() {
  useChatStore.getState().resetOnLogout();
  await supabase.auth.signOut();
  queryClient.removeQueries({ queryKey: ["profile"] });
  queryClient.removeQueries({ queryKey: ["activity"] });
}
