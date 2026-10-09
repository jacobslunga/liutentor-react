import type { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";

// Lets conditional dialogs unmount through framer-motion presence.
export function DialogPresence({ children }: { children: ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
