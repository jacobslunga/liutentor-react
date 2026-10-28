import { ArrowDownIcon } from "lucide-react";
import { IconButton } from "@/components/shared/icon-button";
import { useChatStore } from "@/stores/chat";
import { cn } from "@/lib/utils";

export function ScrollToBottomButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  const generating = useChatStore((state) => state.isLoading);
  const shown = visible || generating;

  return (
    <IconButton
      size="icon-lg"
      variant="outline"
      className={cn(
        "group motion-reduce:transition-none0 absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-[opacity,scale] duration-250 ease-snap disabled:opacity-100",
        shown
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-50 opacity-0",
      )}
      aria-label={generating ? "AI skriver ett svar" : "Scrolla längst ned"}
      aria-busy={generating}
      disabled={generating}
      hideTooltip
      tabIndex={shown && !generating ? 0 : -1}
      aria-hidden={!shown}
      onClick={onClick}
    >
      {generating ? (
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-1 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none"
              style={{
                animationDelay: `${dot * 120}ms`,
                animationDuration: "700ms",
              }}
            />
          ))}
        </span>
      ) : (
        <ArrowDownIcon className="text-foreground transition-colors duration-200" />
      )}
    </IconButton>
  );
}
