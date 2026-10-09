import type { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";

// Keep conditional dialogs (and their current contents) until Radix's
// closed-state CSS animation finishes. No delay or duplicate focus trap.
export function DialogPresence({ children }: { children: ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
