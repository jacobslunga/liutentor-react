import { useCallback, useSyncExternalStore } from "react";

const lists = new Map<string, MediaQueryList>();

function getList(query: string): MediaQueryList {
  let mql = lists.get(query);
  if (!mql) {
    mql = window.matchMedia(query);
    lists.set(query, mql);
  }
  return mql;
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = getList(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(subscribe, () => getList(query).matches);
}
