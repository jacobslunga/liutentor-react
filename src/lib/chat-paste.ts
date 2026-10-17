import DOMPurify from "dompurify";
import TurndownService from "turndown";

const converter = new TurndownService({
  bulletListMarker: "-",
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

converter.remove(["script", "style", "noscript"]);

export function formattedClipboardText(html: string): string | null {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html);
  const document = new DOMParser().parseFromString(clean, "text/html");
  // Leave ordinary text pastes untouched, including existing Markdown.
  if (
    !document.querySelector(
      "ul, ol, strong, b, em, i, pre, code, blockquote, h1, h2, h3, h4, h5, h6, a",
    )
  )
    return null;
  return converter.turndown(document.body) || null;
}
