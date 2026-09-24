import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * Scale of the in-flight zoom gesture, or 1 when no gesture is running.
 *
 * EmbedPDF previews a pinch/wheel zoom with a CSS transform and only commits
 * the real zoom level 150ms after the last event, so the committed level alone
 * lags the gesture. Multiply it by this to show what is actually on screen.
 *
 * It changes every frame during a gesture, so it lives in a tiny external
 * store rather than React state: only components that subscribe re-render.
 */
export interface LiveZoomStore {
  get: () => number;
  set: (value: number) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createLiveZoomStore(): LiveZoomStore {
  let value = 1;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const LiveZoomContext = createContext<LiveZoomStore | null>(null);

export function useLiveZoomScale(): number {
  const store = useContext(LiveZoomContext);
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.get ?? one,
  );
}

const noopSubscribe = () => () => {};
const one = () => 1;

/** Refits the PDF to the width its layout mode allows, then scrolls to the top. */
export const ResetZoomContext = createContext<(() => void) | null>(null);
