import { CheckIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { QUIZ_DIFFICULTY_INFO } from "@/lib/quiz";
import { cn } from "@/lib/utils";
import type { StoredQuizItem } from "@/types/quiz";

const dateLabel = (value: string) =>
  new Date(value).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

interface QuizHistoryListProps {
  history: StoredQuizItem[];
  signedIn: boolean;
  activeQuizId: string | null;
  onLoad: (item: StoredQuizItem) => void;
  onDelete: (item: StoredQuizItem) => void;
}

export function QuizHistoryList({ history, signedIn, activeQuizId, onLoad, onDelete }: QuizHistoryListProps) {
  const [pendingDelete, setPendingDelete] = useState<StoredQuizItem | null>(null);

  return (
    <section className="mt-10 w-full">
      <div className="flex items-center justify-between border-b pb-2">
        <p className="text-xs font-medium text-muted-foreground">Tidigare quiz</p>
        {signedIn && history.length > 0 && (
          <span className="text-xs text-muted-foreground/60 tabular-nums">{history.length}</span>
        )}
      </div>

      {!signedIn ? (
        <p className="pt-4 text-sm text-muted-foreground">Logga in för att se tidigare quiz.</p>
      ) : history.length === 0 ? (
        <p className="pt-4 text-sm text-muted-foreground">Inga sparade quiz än.</p>
      ) : (
        <div className="flex flex-col">
          {history.map((item) => {
            const difficulty = item.data.meta?.difficulty;
            const sourceCount = item.data.meta?.sourceCount ?? 0;
            return (
              <div
                key={item.id}
                className={cn("group flex items-center gap-2 border-b last:border-b-0", item.id === activeQuizId && "bg-muted/40")}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-3 text-left"
                  onClick={() => onLoad(item)}
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{dateLabel(item.createdAt)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {difficulty && `${QUIZ_DIFFICULTY_INFO[difficulty].label} · `}
                    {item.data.quiz.questions.length} frågor
                    {sourceCount > 0 && ` · ${sourceCount} tentor`}
                  </span>
                  {item.id === activeQuizId && <CheckIcon className="size-4 shrink-0 text-primary" />}
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                  aria-label={`Ta bort quiz från ${dateLabel(item.createdAt)}`}
                  onClick={() => setPendingDelete(item)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort quizet?</AlertDialogTitle>
            <AlertDialogDescription>
              Quizet från {pendingDelete && dateLabel(pendingDelete.createdAt)} tas bort permanent. Det går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
