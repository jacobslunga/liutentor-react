import {
  animate,
  MotionConfigContext,
  motionValue,
  useMotionValue,
} from "framer-motion";
import { useContext, useEffect } from "react";
import { create } from "zustand";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettingsStore } from "@/stores/settings";

export const SIDEBAR_INLINE_QUERY = "(min-width: 768px)";

const useDrawerStore = create<{ open: boolean }>(() => ({ open: false }));

// Motion styles read this directly, so dragging never re-renders React (or
// restyles the chat through an inherited CSS variable, which Safari does slowly).
export const sidebarWidth = motionValue(
  useSettingsStore.getState().chatSidebarWidth,
);
useSettingsStore.subscribe((s) => sidebarWidth.set(s.chatSidebarWidth));

// 0 = closed, 1 = open, sprung with the surrounding MotionConfig transition.
export function useSidebarProgress(open: boolean) {
  const { transition, skipAnimations } = useContext(MotionConfigContext);
  const progress = useMotionValue(open ? 1 : 0);
  useEffect(() => {
    const target = open ? 1 : 0;
    if (skipAnimations) {
      progress.set(target);
      return;
    }
    const controls = animate(progress, target, transition);
    return () => controls.stop();
  }, [open, progress, skipAnimations, transition]);
  return progress;
}

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
