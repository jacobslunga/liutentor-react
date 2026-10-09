import { useEffect } from "react";
import { usePresence } from "framer-motion";

export function useDialogPresence() {
  const [open, remove] = usePresence();

  useEffect(() => {
    if (!open) remove?.();
  }, [open, remove]);

  return { open };
}
