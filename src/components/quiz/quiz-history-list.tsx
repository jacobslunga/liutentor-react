import { DialogPresence } from "@/components/shared/dialog-presence";
import { CheckIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { QUIZ_DIFFICULTY_INFO } from "@/lib/quiz";
import { cn } from "@/lib/utils";
import type { StoredQuizItem } from "@/types/quiz";
import { IconButton } from "@/components/shared/icon-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const dateLabel = (value: string) =>
  new Date(value).toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface QuizHistoryListProps {
  history: StoredQuizItem[];
  signedIn: boolean;
  activeQuizId: string | null;
  onLoad: (item: StoredQuizItem) => void;
  onDelete: (item: StoredQuizItem) => void;
}

export function QuizHistoryList({
  history,
  signedIn,
  activeQuizId,
  onLoad,
  onDelete,
}: QuizHistoryListProps) {
  const [pendingDelete, setPendingDelete] = useState<StoredQuizItem | null>(
    null,
  );

  return (
    <section className="w-full">
      <div className="flex items-baseline justify-between pb-2">
        <h3 className="text-sm font-medium">Tidigare quiz</h3>
        {signedIn && history.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {history.length}
          </span>
        )}
      </div>

      {!signedIn ? (
        <p className="text-sm text-muted-foreground">
          <Link
            to="/logga-in"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Logga in
          </Link>{" "}
          för att spara dina quiz och kunna göra om dem senare.
        </p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Quiz du gör sparas här, så att du kan göra om dem senare.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {history.map((item) => {
            const difficulty = item.data.meta?.difficulty;
            const sourceCount = item.data.meta?.sourceCount ?? 0;
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-muted/60",
                  item.id === activeQuizId && "bg-muted/60",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                  onClick={() => onLoad(item)}
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {dateLabel(item.createdAt)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {difficulty &&
                      `${QUIZ_DIFFICULTY_INFO[difficulty].label} · `}
                    {item.data.quiz.questions.length} frågor
                    {sourceCount > 0 && ` · ${sourceCount} tentor`}
                  </span>
                  {item.id === activeQuizId ? (
                    <CheckIcon className="size-4 shrink-0 text-brand" />
                  ) : (
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Ta bort quiz från ${dateLabel(item.createdAt)}`}
                  onClick={() => setPendingDelete(item)}
                >
                  <Trash2Icon />
                </IconButton>
              </div>
            );
          })}
        </div>
      )}

      <DialogPresence>
        {pendingDelete && (
          <ConfirmDialog
            title="Ta bort quizet?"
            confirmLabel="Ta bort"
            onConfirm={() => {
              onDelete(pendingDelete);
              setPendingDelete(null);
            }}
            onCancel={() => setPendingDelete(null)}
          >
            Quizet från {dateLabel(pendingDelete.createdAt)} tas bort permanent.
            Det går inte att ångra.
          </ConfirmDialog>
        )}
      </DialogPresence>
    </section>
  );
}
