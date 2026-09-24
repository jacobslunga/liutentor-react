import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DocSection } from "@/types/doc";

/** A two-column block: heading on the left (sticky on desktop), body on the right. */
export function DocBlock({
  heading,
  children,
  className,
}: {
  heading: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-x-12 gap-y-5 py-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-14", className)}>
      <div className="lg:sticky lg:top-24 lg:self-start">{heading}</div>
      <div className="max-w-2xl">{children}</div>
    </section>
  );
}

export function DocParagraph({ children }: { children: ReactNode }) {
  return <p className="text-[0.9375rem] leading-[1.75] text-foreground/75">{children}</p>;
}

export function DocHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-lg leading-snug font-medium">{children}</h2>;
}

/** Contact/action block at the end of a document. */
export function DocContact({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <DocBlock heading={<DocHeading>{title}</DocHeading>} className="border-t py-14 lg:py-20">
      <DocParagraph>{body}</DocParagraph>
      {children && <div className="mt-6">{children}</div>}
    </DocBlock>
  );
}

/** Numbered legal sections with a table of contents. */
export function LegalDocument({ sections, footer }: { sections: DocSection[]; footer?: ReactNode }) {
  const entries = sections.map((section, i) => ({
    ...section,
    id: `sektion-${i + 1}`,
    number: String(i + 1).padStart(2, "0"),
    paragraphs: Array.isArray(section.content) ? section.content : [section.content],
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <nav aria-label="Innehåll" className="pt-12 sm:pt-16">
        <p className="text-sm font-medium text-muted-foreground">Innehåll</p>
        <ol className="mt-5 grid gap-x-10 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className="group flex items-baseline gap-4 border-b py-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="text-xs text-muted-foreground/60 tabular-nums transition-colors duration-150 group-hover:text-primary">
                  {entry.number}
                </span>
                <span className="flex-1">{entry.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-16 sm:mt-24">
        {entries.map((entry) => (
          <section
            key={entry.id}
            id={entry.id}
            className="grid scroll-mt-24 gap-x-12 gap-y-5 border-t py-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-14"
          >
            <div className="lg:sticky lg:top-24 lg:self-start">
              <span className="text-xs text-primary tabular-nums">{entry.number}</span>
              <h2 className="mt-2 font-serif text-lg leading-snug font-medium">{entry.title}</h2>
            </div>
            <div className="max-w-2xl space-y-4">
              {entry.paragraphs.map((paragraph, i) => (
                <DocParagraph key={i}>{paragraph}</DocParagraph>
              ))}
              {entry.items && (
                <ul className="space-y-2.5 pt-1">
                  {entry.items.map((item) => (
                    <li
                      key={item}
                      className="relative pl-6 text-[0.9375rem] leading-[1.7] text-foreground/70 before:absolute before:top-[0.8em] before:left-0 before:h-px before:w-3 before:bg-foreground/40"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      {footer}
    </div>
  );
}
