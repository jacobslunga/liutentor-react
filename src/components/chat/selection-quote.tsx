import { useChatMarkdownReady } from "@/hooks/use-chat-markdown";
import { renderCachedChatMarkdown } from "@/lib/chat-markdown";

/** A quoted selection rendered inline, with math re-rendered from its TeX. */
export function SelectionQuote({ text }: { text: string }) {
  const ready = useChatMarkdownReady();
  if (!ready) return <span className="selection-quote">{text}</span>;
  return (
    <span
      className="selection-quote"
      dangerouslySetInnerHTML={{ __html: renderCachedChatMarkdown(text) }}
    />
  );
}
