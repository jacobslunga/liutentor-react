import { createContext, useContext, useSyncExternalStore } from "react";

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

export const ResetZoomContext = createContext<(() => void) | null>(null);
