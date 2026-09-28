import { Link } from "@tanstack/react-router";
import { FolderIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConversationList } from "@/hooks/use-conversation-list";
import type { Conversation } from "@/queries/conversations";
import { useStudyCourse } from "@/queries/study-courses";
import { CourseMaterial } from "./course-material";

/**
 * A study course's page: its name, a prompt that starts a chat in the course,
 * and tabs for the course's chats and its material. Shown as the learning
 * chat's empty state, so the first turn turns into the chat in place.
 */
export function CourseHome({
  courseId,
  input,
}: {
  courseId: string;
  input: ReactNode;
}) {
  const { course, isPending } = useStudyCourse(courseId);

  if (isPending) {
    return (
      <div
        role="status"
        className="flex flex-1 animate-in items-center justify-center gap-2 text-sm text-muted-foreground fill-mode-both fade-in-0"
        style={{ animationDelay: "300ms" }}
      >
        <LoaderCircleIcon className="size-5 animate-spin" />
        <span>Laddar kursen...</span>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Kursen finns inte, eller så har den raderats.
        </p>
        <Button asChild variant="outline">
          <Link to="/chatt">Till chatten</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 animate-in overflow-y-auto overscroll-contain duration-300 fade-in-0">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 pt-20 pb-16">
        <div className="flex items-center gap-3 px-3">
          <FolderIcon className="size-6 shrink-0 fill-primary text-primary" />
          <h1 className="truncate font-heading text-2xl sm:text-3xl">
            {course.name}
          </h1>
        </div>

        {input}

        <Tabs defaultValue="chats" className="px-3">
          <TabsList>
            <TabsTrigger value="chats">Chattar</TabsTrigger>
            <TabsTrigger value="material">Material</TabsTrigger>
          </TabsList>
          <TabsContent value="chats" className="pt-3">
            <CourseChats courseId={courseId} />
          </TabsContent>
          <TabsContent value="material" className="pt-3">
            <CourseMaterial courseId={courseId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CourseChats({ courseId }: { courseId: string }) {
  const { conversations, isPending, isError, remove } = useConversationList(
    "learn",
    { courseId },
  );
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await remove([pendingDelete.id]);
      toast.success("Chatten raderades");
      setPendingDelete(null);
    } catch {
      toast.error("Kunde inte radera chatten.");
    } finally {
      setDeleting(false);
    }
  }

  if (isPending)
    return <p className="text-sm text-muted-foreground">Hämtar chattar...</p>;
  if (isError)
    return (
      <p className="text-sm text-destructive">Kunde inte hämta chattar.</p>
    );
  if (!conversations.length)
    return (
      <p className="text-sm text-muted-foreground">
        Inga chattar än. Ställ en fråga ovan för att starta en.
      </p>
    );

  return (
    <>
      <ul className="divide-y rounded-2xl border">
        {conversations.map((chat) => (
          <li
            key={chat.id}
            className="group relative flex items-center transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-accent/60"
          >
            <Link
              to="/chatt/$conversationId"
              params={{ conversationId: chat.id }}
              className="flex min-w-0 flex-1 items-baseline justify-between gap-3 py-2.5 pr-11 pl-3"
            >
              <span className="truncate text-sm">{chat.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(chat.createdAt).toLocaleDateString("sv-SE", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1.5 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              aria-label={`Radera ${chat.title}`}
              onClick={() => setPendingDelete(chat)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(value) => !value && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent className="data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Radera chatten?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" raderas permanent och kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Raderar..." : "Radera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
