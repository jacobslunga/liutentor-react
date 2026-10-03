import { useEffect } from "react";
import { create } from "zustand";

interface PageLoadingState {
  pending: number;
  failed: boolean;
}

export const usePageLoadingStore = create<PageLoadingState>(() => ({
  pending: 0,
  failed: false,
}));

function begin() {
  usePageLoadingStore.setState((s) => ({ pending: s.pending + 1 }));
  let released = false;

  return (opts?: { error?: boolean }) => {
    if (released) return;
    released = true;
    usePageLoadingStore.setState((s) => {
      const pending = Math.max(0, s.pending - 1);
      return {
        pending,
        failed: opts?.error ? true : pending === 0 ? false : s.failed,
      };
    });
  };
}

export function usePageLoadingTask(pending: boolean, error = false) {
  useEffect(() => {
    if (!pending) return;
    const release = begin();
    return () => release({ error });
  }, [pending, error]);
}
