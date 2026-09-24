import DOMPurify from "dompurify";
import katex from "katex";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

/** Puts \[..\] and \(..\) into $-delimiters and spaces math off adjacent letters. */
function normalizeMathDelimiters(content: string): string {
  const normalized = content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `$$${inner.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`)
    .replace(/\$(?!\$)\s*([^$\n]*?\S)\s*\$/g, (_m, inner: string) => `$${inner.trim()}$`);

  return normalized.replace(/\$(?!\$)[^$\n]+?\$/gu, (math, offset: number, source: string) => {
    const before = source[offset - 1] ?? "";
    const after = source[offset + math.length] ?? "";
    return `${/\p{L}/u.test(before) ? " " : ""}${math}${/\p{L}/u.test(after) ? " " : ""}`;
  });
}

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
md.use(texmath, {
  engine: katex,
  delimiters: ["dollars"],
  katexOptions: { throwOnError: false, errorColor: "inherit" },
});

const SANITIZE = {
  ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "mover", "munder", "mtext", "annotation"],
  ADD_ATTR: ["xmlns", "encoding"],
};

export function QuizMarkdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(
    () => DOMPurify.sanitize(md.render(normalizeMathDelimiters(content)), SANITIZE),
    [content],
  );

  return (
    <div
      className={cn(
        "prose max-w-none text-inherit dark:prose-invert [&_.katex]:max-w-full [&_.katex]:whitespace-nowrap [&>p]:my-0",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
