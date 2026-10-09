import type { AnimationEvent } from "react";
import { usePresence } from "framer-motion";

export function useDialogPresence() {
  const [open, remove] = usePresence();

  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (
      event.target === event.currentTarget &&
      event.currentTarget.dataset.state === "closed"
    ) {
      remove?.();
    }
  };

  return { open, onAnimationEnd };
}
