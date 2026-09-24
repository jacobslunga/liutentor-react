import { useEffect, useState } from "react";
import { initChatMarkdown, isChatMarkdownReady } from "@/lib/chat-markdown";

/** True once markdown (with KaTeX and Shiki) has loaded, or failed to load. */
export function useChatMarkdownReady(): boolean {
  const [ready, setReady] = useState(isChatMarkdownReady);

  useEffect(() => {
    if (ready) return;
    let active = true;
    initChatMarkdown()
      .catch((error) => console.error("[chat] markdown failed to initialise", error))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [ready]);

  return ready;
}
