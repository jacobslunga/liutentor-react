import { lazy, Suspense, useEffect, useRef } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useChatStore } from "@/stores/chat";
import type { ChatWindowProps } from "./chat-window";
import { ChatMotion } from "./chat-motion";

const ChatWindow = lazy(() => import("./chat-window"));

export function MobileChatOverlay({
  open,
  ...props
}: ChatWindowProps & { open: boolean }) {
  const title = useChatStore((s) => s.currentConversationTitle);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previousFocus?.focus();
  }, [open]);

  return (
    <section
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Chatt"}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      data-state={open ? "open" : "closed"}
      className="mobile-exam-overlay fixed inset-0 z-40 h-dvh w-full overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] outline-none"
    >
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <LoaderCircleIcon
              className="size-5 animate-spin text-muted-foreground"
              aria-label="Laddar chatten"
            />
          </div>
        }
      >
        <ChatMotion>
          <ChatWindow {...props} mobile />
        </ChatMotion>
      </Suspense>
    </section>
  );
}
