import { create } from "zustand";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettingsStore } from "@/stores/settings";


export const SIDEBAR_INLINE_QUERY = "(min-width: 768px)";


const useDrawerStore = create<{ open: boolean }>(() => ({ open: false }));





export function useLearnSidebar() {
  const inline = useMediaQuery(SIDEBAR_INLINE_QUERY);
  const inlineOpen = useSettingsStore((s) => s.chatSidebarOpen);
  const drawerOpen = useDrawerStore((s) => s.open);

  const setOpen = (value: boolean) => {
    if (inline) useSettingsStore.getState().setChatSidebarOpen(value);
    else useDrawerStore.setState({ open: value });
  };

  return {
    inline,
    open: inline ? inlineOpen : drawerOpen,
    setOpen,

    closeDrawer: () => useDrawerStore.setState({ open: false }),
  };
}

export const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);


export function isSidebarShortcut(e: KeyboardEvent) {
  return (
    !e.repeat &&
    (IS_MAC ? e.metaKey : e.ctrlKey) &&
    !e.altKey &&
    !e.shiftKey &&
    (e.key === "." || e.code === "Period")
  );
}
