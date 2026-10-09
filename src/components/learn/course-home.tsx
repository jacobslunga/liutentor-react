import { DialogPresence } from "@/components/shared/dialog-presence";
import { Link } from "@tanstack/react-router";
import { m, type MotionStyle } from "framer-motion";
import { FolderIcon, Trash2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { RouterLinkButton } from "@/components/shared/router-link";
import { useConversationList } from "@/hooks/use-conversation-list";
import type { Conversation } from "@/queries/conversations";
import { useStudyCourse } from "@/queries/study-courses";
import { CourseMaterial } from "./course-material";
import { IconButton } from "@/components/shared/icon-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CourseHome({
  courseId,
  input,
  scrollerStyle,
}: {
  courseId: string;
  input: ReactNode;
  scrollerStyle?: MotionStyle;
}) {
  const { course, isPending } = useStudyCourse(courseId);

  if (isPending) {
    return (
      <div
        role="status"
        className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Spinner />
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
        <RouterLinkButton variant="outline" to="/chatt">
          Till chatten
        </RouterLinkButton>
      </div>
    );
  }

  return (
    <m.div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      style={scrollerStyle}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 pt-20 pb-16">
        <div className="flex items-center gap-3 px-3">
          <FolderIcon className="size-6 shrink-0 fill-brand text-brand" />
          <h1 className="truncate text-2xl sm:text-3xl">{course.name}</h1>
        </div>

        {input}

        <Tabs defaultValue="chats" className="px-3">
          <TabsList variant="line" aria-label="Kursens innehåll">
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
    </m.div>
  );
}

function CourseChats({ courseId }: { courseId: string }) {
  const { conversations, isPending, isError, remove } = useConversationList(
    "learn",
    { courseId },
  );
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
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
            <IconButton
              variant="ghost"
              size="icon-sm"
              className="absolute right-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              aria-label={`Radera ${chat.title}`}
              onClick={() => setPendingDelete(chat)}
            >
              <Trash2Icon />
            </IconButton>
          </li>
        ))}
      </ul>

      <DialogPresence>
        {pendingDelete && (
          <ConfirmDialog
            title="Radera chatten?"
            confirmLabel="Radera"
            isPending={deleting}
            onConfirm={() => void confirmDelete()}
            onCancel={() => setPendingDelete(null)}
          >
            "{pendingDelete.title}" raderas permanent och kan inte ångras.
          </ConfirmDialog>
        )}
      </DialogPresence>
    </>
  );
}
