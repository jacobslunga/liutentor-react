import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";

const CHAR_MS = 28;







export function TypedTitle({
  title,
  startedAt,
  className,
}: {
  title: string;
  startedAt: number | null;
  className?: string;
}) {
  const [now, setNow] = useState(() => performance.now());
  const typed =
    startedAt === null
      ? title.length
      : Math.max(0, Math.floor((now - startedAt) / CHAR_MS));
  const isTyping = typed < title.length;

  useEffect(() => {
    if (!isTyping) return;
    const timer = window.setInterval(() => setNow(performance.now()), CHAR_MS);
    return () => window.clearInterval(timer);
  }, [isTyping]);

  return (
    <span className={cn("truncate", className)} aria-label={title}>
      <span aria-hidden="true">{title.slice(0, typed)}</span>
      {isTyping && (
        <span
          className="ml-1 inline-block size-2 rounded-full bg-current align-middle"
          aria-hidden
        />
      )}
    </span>
  );
}


export function ConversationTitle() {
  const title = useChatStore((s) =>
    s.isConversationTitleReady ? s.currentConversationTitle : null,
  );
  const startedAt = useChatStore((s) => s.titleTypingStartedAt);
  if (!title) return null;
  return (
    <TypedTitle
      title={title}
      startedAt={startedAt}
      className="pointer-events-none max-w-[min(24rem,50vw)] text-sm font-normal"
    />
  );
}
