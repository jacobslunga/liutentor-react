import type { ReactNode } from "react";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  lead?: string;
  meta?: string;
  children?: ReactNode;
}

export function PageIntro({
  eyebrow,
  title,
  lead,
  meta,
  children,
}: PageIntroProps) {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:px-8 sm:pt-24 sm:pb-16">
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-[2.25rem] leading-[1.1] font-bold tracking-[-0.015em] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {lead && (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {lead}
          </p>
        )}
        {meta && (
          <p className="mt-8 text-sm text-muted-foreground/70">{meta}</p>
        )}
        {children}
      </div>
    </header>
  );
}
