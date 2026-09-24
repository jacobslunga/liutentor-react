import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChatWindowProps {
  examId: string;
  courseCode: string;
  examUrl: string;
  solutionUrl: string | null;
  onClose: () => void;
}

/** Placeholder until the chat is ported; lazy-loaded (default export). */
export default function ChatWindow({ onClose }: ChatWindowProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-3">
        <span className="text-sm font-semibold">Chatt</span>
        <Button variant="ghost" size="icon" aria-label="Stäng chatten" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Chatten kommer snart.
      </div>
    </div>
  );
}
