import { create } from "zustand";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettingsStore } from "@/stores/settings";

/** Wide enough for the sidebar to sit beside the chat instead of over it. */
export const SIDEBAR_INLINE_QUERY = "(min-width: 768px)";

/** The drawer on narrow screens; it always starts closed. */
const useDrawerStore = create<{ open: boolean }>(() => ({ open: false }));

/**
 * Whether the learning chat's sidebar is showing. Wide screens remember the
 * choice; narrow screens use a drawer that closes after navigating.
 */
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
    /** Closes the drawer; the inline sidebar stays as the user left it. */
    closeDrawer: () => useDrawerStore.setState({ open: false }),
  };
}

export const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Cmd+. on macOS, Ctrl+. elsewhere: shows or hides the sidebar. */
export function isSidebarShortcut(e: KeyboardEvent) {
  return (
    !e.repeat &&
    (IS_MAC ? e.metaKey : e.ctrlKey) &&
    !e.altKey &&
    !e.shiftKey &&
    (e.key === "." || e.code === "Period")
  );
}
