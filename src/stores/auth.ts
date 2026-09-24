import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  /** False until the persisted session has been read on startup. */
  ready: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  user: null,
  ready: false,
}));

let readyPromise: Promise<void> | null = null;

/**
 * Starts listening to Supabase auth. Safe to call more than once; resolves when
 * the initial session is known, so route guards can await it.
 */
export function initAuth(): Promise<void> {
  readyPromise ??= new Promise((resolve) => {
    supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.setState({
        session,
        user: session?.user ?? null,
        ready: true,
      });
      resolve();
    });
  });
  return readyPromise;
}

export async function getUser(): Promise<User | null> {
  await initAuth();
  return useAuthStore.getState().user;
}

export const useUser = () => useAuthStore((s) => s.user);
