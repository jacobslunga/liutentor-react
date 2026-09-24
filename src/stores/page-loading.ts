import { useEffect } from "react";
import { create } from "zustand";

interface PageLoadingState {
  /** Reference count of work the page is still waiting for. */
  pending: number;
  failed: boolean;
}

/**
 * Work outside router navigation and TanStack Query (loading the PDF engine,
 * parsing a document) registers here so the loading bar waits for it too.
 */
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

/** Holds the loading bar for as long as `pending` is true. */
export function usePageLoadingTask(pending: boolean, error = false) {
  useEffect(() => {
    if (!pending) return;
    const release = begin();
    return () => release({ error });
  }, [pending, error]);
}
