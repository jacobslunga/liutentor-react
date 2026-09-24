import { FileTextIcon, ImageIcon } from "lucide-react";

export function ChatDropOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 animate-in bg-background/90 duration-150 fade-in-0 zoom-in-[0.985]"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div
          className="relative mb-7 h-20 w-32 animate-in duration-200 fade-in-0 slide-in-from-bottom-2"
          aria-hidden
        >
          <div
            className="absolute top-3 left-4 flex size-14 -rotate-12 items-center justify-center rounded-2xl text-primary-foreground shadow-lg"
            style={{
              backgroundColor: "color-mix(in oklab, var(--primary) 68%, white)",
            }}
          >
            <ImageIcon className="size-7" />
          </div>
          <div
            className="absolute top-1 right-4 flex size-14 rotate-12 items-center justify-center rounded-2xl text-primary-foreground shadow-lg"
            style={{
              backgroundColor: "color-mix(in oklab, var(--primary) 84%, white)",
            }}
          >
            <FileTextIcon className="size-7" />
          </div>
          <div className="absolute bottom-0 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl">
            <ImageIcon className="size-7" />
          </div>
        </div>
        <p className="text-2xl font-semibold">Lägg till vad som helst</p>
        <p className="mt-2 text-base text-muted-foreground">
          Släpp en fil här för att lägga till den i chatten
        </p>
      </div>
    </div>
  );
}
