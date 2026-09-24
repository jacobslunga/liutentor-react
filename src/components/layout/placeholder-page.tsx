/** Temporary body for routes whose page hasn't been ported yet. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-2 px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">Den här sidan kommer snart.</p>
    </div>
  );
}
