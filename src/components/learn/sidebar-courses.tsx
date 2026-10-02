import { ActionList, ActionMenu, } from "@primer/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  EllipsisIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { HoverCard } from "radix-ui";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createStudyCourse,
  deleteStudyCourse,
  renameStudyCourse,
  type StudyCourse,
} from "@/lib/study-courses";
import { cn } from "@/lib/utils";
import { studyCoursesKey, useStudyCourses } from "@/queries/study-courses";
import { useConversationList } from "@/hooks/use-conversation-list";
import { useChatStore } from "@/stores/chat";
import { CourseNameDialog } from "./course-name-dialog";
import { IconButton } from "@/components/shared/icon-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/** "Kurser" in the chat sidebar: the user's study courses, or a sign-in nudge. */
export function SidebarCourses({ onNavigate }: { onNavigate: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { courses, user, isPending, isError } = useStudyCourses();
  const routeCourseId = useParams({ strict: false }).courseId ?? null;
  const openChatCourseId = useChatStore((s) =>
    s.currentConversationId ? s.currentCourseId : null,
  );
  const activeId = routeCourseId ?? openChatCourseId;

  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<StudyCourse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudyCourse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const updateCache = (update: (old: StudyCourse[]) => StudyCourse[]) => {
    if (user)
      queryClient.setQueryData<StudyCourse[]>(studyCoursesKey(user.id), (old) =>
        update(old ?? []),
      );
  };

  async function create(name: string) {
    if (!user) return;
    try {
      const course = await createStudyCourse(user.id, name);
      updateCache((old) => [course, ...old]);
      setCreating(false);
      onNavigate();
      void navigate({
        to: "/chatt/kurs/$courseId",
        params: { courseId: course.id },
      });
    } catch {
      toast.error("Kunde inte skapa kursen.");
      throw new Error("create failed");
    }
  }

  async function rename(name: string) {
    if (!renaming) return;
    try {
      await renameStudyCourse(renaming.id, name);
      updateCache((old) =>
        old.map((c) => (c.id === renaming.id ? { ...c, name } : c)),
      );
      setRenaming(null);
    } catch {
      toast.error("Kunde inte byta namn.");
      throw new Error("rename failed");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteStudyCourse(pendingDelete.id);
      updateCache((old) => old.filter((c) => c.id !== pendingDelete.id));
      // Its chats went with it.
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (pendingDelete.id === activeId)
        void navigate({ to: "/chatt", replace: true });
      toast.success("Kursen raderades");
      setPendingDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunde inte radera kursen.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between pr-1 pb-1 pl-3">
        <h3 className="text-xs text-muted-foreground/70">Kurser</h3>
        {user && (
          <IconButton variant="ghost" size="icon-sm" aria-label="Ny kurs" onClick={() => setCreating(true)}><PlusIcon /></IconButton>
        )}
      </div>

      {!user ? (
        <p className="px-3 py-1 text-xs leading-relaxed text-muted-foreground">
          <Link to="/logga-in" className="underline underline-offset-2">
            Logga in
          </Link>{" "}
          för att skapa kurser med eget material.
        </p>
      ) : isPending ? null : isError ? (
        <p className="px-3 py-1 text-sm text-destructive">
          Kunde inte hämta kurser.
        </p>
      ) : !courses.length ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          onClick={() => setCreating(true)}
        >
          <PlusIcon className="size-4" />
          Skapa din första kurs
        </button>
      ) : (
        <ul className="space-y-px">
          {courses.map((course) => (
            <CourseHoverList
              key={course.id}
              course={course}
              onNavigate={onNavigate}
            >
              <li
                className={cn(
                  "group relative flex items-center rounded-lg transition-colors",
                  course.id === activeId ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <Link
                  to="/chatt/kurs/$courseId"
                  params={{ courseId: course.id }}
                  className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-8 pl-3"
                  onClick={onNavigate}
                >
                  <FolderIcon className="size-4 shrink-0 fill-primary text-primary" />
                  <span className="truncate text-sm">{course.name}</span>
                </Link>
                <ActionMenu>
                  <ActionMenu.Anchor>
                    <IconButton variant="ghost" size="icon-sm" aria-label={`Alternativ för ${course.name}`} hideTooltip className="absolute right-1 opacity-100 group-hover:opacity-100 aria-expanded:opacity-100 md:opacity-0"><EllipsisIcon /></IconButton>
                  </ActionMenu.Anchor>
                  <ActionMenu.Overlay align="start" width="small">
                    <ActionList>
                      <ActionList.Item onSelect={() => setRenaming(course)}>
                        <ActionList.LeadingVisual>
                          <PencilIcon />
                        </ActionList.LeadingVisual>
                        Byt namn
                      </ActionList.Item>
                      <ActionList.Item
                        variant="danger"
                        onSelect={() => setPendingDelete(course)}
                      >
                        <ActionList.LeadingVisual>
                          <Trash2Icon />
                        </ActionList.LeadingVisual>
                        Ta bort
                      </ActionList.Item>
                    </ActionList>
                  </ActionMenu.Overlay>
                </ActionMenu>
              </li>
            </CourseHoverList>
          ))}
        </ul>
      )}

      <CourseNameDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={create}
      />
      <CourseNameDialog
        open={!!renaming}
        onOpenChange={(value) => !value && setRenaming(null)}
        initialName={renaming?.name}
        onSubmit={rename}
      />

      {pendingDelete && (
        <ConfirmDialog
          title="Radera kursen?"
          confirmLabel="Radera"
          isPending={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        >
          "{pendingDelete.name}" raderas permanent, med allt material och alla
          chattar i kursen. Det går inte att ångra.
        </ConfirmDialog>
      )}
    </section>
  );
}

/**
 * A course's chats, shown beside its sidebar row on hover. It stays open while
 * the pointer is on the row or on the list itself, and closes shortly after it
 * has left both. Touch devices never hover, so there the row just links on.
 */
function CourseHoverList({
  course,
  onNavigate,
  children,
}: {
  course: StudyCourse;
  onNavigate: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <HoverCard.Root
      open={open}
      onOpenChange={setOpen}
      openDelay={250}
      closeDelay={150}
    >
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="right"
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className="z-50 flex max-h-[min(24rem,var(--radix-hover-card-content-available-height))] w-72 origin-(--radix-hover-card-content-transform-origin) flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1"
        >
          {/* Only fetched while open, and cached for the next hover. */}
          {open && (
            <CourseChatList
              course={course}
              onNavigate={() => {
                setOpen(false);
                onNavigate();
              }}
            />
          )}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

function CourseChatList({
  course,
  onNavigate,
}: {
  course: StudyCourse;
  onNavigate: () => void;
}) {
  const { conversations, isPending, isError } = useConversationList("learn", {
    courseId: course.id,
  });

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <p className="truncate text-sm font-medium">{course.name}</p>
        <Link
          to="/chatt/kurs/$courseId"
          params={{ courseId: course.id }}
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onNavigate}
        >
          <PlusIcon className="size-3" />
          Ny chatt
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
        {isPending ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            Hämtar chattar...
          </p>
        ) : isError ? (
          <p className="px-2 py-1.5 text-sm text-destructive">
            Kunde inte hämta chattar.
          </p>
        ) : !conversations.length ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            Inga chattar i kursen än.
          </p>
        ) : (
          <ul>
            {conversations.map((chat) => (
              <li key={chat.id}>
                <Link
                  to="/chatt/$conversationId"
                  params={{ conversationId: chat.id }}
                  className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
                  onClick={onNavigate}
                >
                  <span className="truncate text-sm">{chat.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(chat.createdAt).toLocaleDateString("sv-SE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
