import { Spinner } from "@primer/react";
import { UnderlinePanels } from "@primer/react/experimental";
import { Link } from "@tanstack/react-router";
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
        className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Spinner size="small" srText={null} />
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
        <RouterLinkButton variant="outline" to="/chatt">Till chatten</RouterLinkButton>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 pt-20 pb-16">
        <div className="flex items-center gap-3 px-3">
          <FolderIcon className="size-6 shrink-0 fill-primary text-primary" />
          <h1 className="truncate text-2xl sm:text-3xl">{course.name}</h1>
        </div>

        {input}

        <UnderlinePanels aria-label="Kursens innehåll" className="px-3">
          <UnderlinePanels.Tab>Chattar</UnderlinePanels.Tab>
          <UnderlinePanels.Tab>Material</UnderlinePanels.Tab>
          <UnderlinePanels.Panel className="pt-3">
            <CourseChats courseId={courseId} />
          </UnderlinePanels.Panel>
          <UnderlinePanels.Panel className="pt-3">
            <CourseMaterial courseId={courseId} />
          </UnderlinePanels.Panel>
        </UnderlinePanels>
      </div>
    </div>
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
            <IconButton variant="ghost" size="icon-sm" className="absolute right-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100" aria-label={`Radera ${chat.title}`} onClick={() => setPendingDelete(chat)}><Trash2Icon /></IconButton>
          </li>
        ))}
      </ul>

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
    </>
  );
}
