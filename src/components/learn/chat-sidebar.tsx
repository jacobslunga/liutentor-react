import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  EllipsisIcon,
  LogOutIcon,
  PanelLeftIcon,
  SquarePenIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthActions } from "@/components/auth/auth-actions";
import { UserAvatar } from "@/components/auth/user-avatar";
import { TypedTitle } from "@/components/chat/conversation-title";
import { LogoIcon } from "@/components/layout/logo-icon";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConversationList } from "@/hooks/use-conversation-list";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/queries/conversations";
import { useProfile } from "@/queries/profile";
import { useChatStore } from "@/stores/chat";
import { isSidebarShortcut, useLearnSidebar } from "@/stores/learn-sidebar";
import { ChatSettingsMenu } from "./chat-settings-menu";
import { SidebarCourses } from "./sidebar-courses";
import { SidebarShortcutKbd } from "./sidebar-shortcut";

/**
 * The learning chat's conversation list. Sits beside the chat on wide screens
 * and slides over it as a drawer on narrow ones.
 */
export function ChatSidebar() {
  const { inline, open, setOpen } = useLearnSidebar();

  // Cmd/Ctrl+. shows or hides the sidebar, inline or as a drawer.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSidebarShortcut(e)) return;
      e.preventDefault();
      setOpen(!open);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  // The drawer closes with Escape like any other overlay.
  useEffect(() => {
    if (inline || !open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inline, open, setOpen]);

  if (inline) {
    return (
      <aside
        aria-label="Chattar"
        className={cn(
          "shrink-0 overflow-hidden border-r bg-muted/30 transition-[width] duration-200 ease-out",
          open ? "w-64" : "w-0 border-r-0",
        )}
      >
        <div className="h-full w-64">
          <SidebarContent />
        </div>
      </aside>
    );
  }

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        aria-label="Chattar"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] border-r bg-background shadow-lg transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

function SidebarContent() {
  const { setOpen, closeDrawer } = useLearnSidebar();
  const navigate = useNavigate();
  const activeId = useParams({ strict: false }).conversationId ?? null;
  const { conversations, groups, isPending, isError, isSignedIn, remove } =
    useConversationList("learn");
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await remove([pendingDelete.id]);
      if (pendingDelete.id === activeId)
        void navigate({ to: "/chatt", replace: true });
      toast.success("Chatten raderades");
      setPendingDelete(null);
    } catch {
      toast.error("Kunde inte radera chatten.");
    } finally {
      setDeleting(false);
    }
  }

  let body;
  if (isPending)
    body = (
      <p className="px-3 py-2 text-sm text-muted-foreground">
        Hämtar chattar...
      </p>
    );
  else if (isError)
    body = (
      <p className="px-3 py-2 text-sm text-destructive">
        Kunde inte hämta chattar.
      </p>
    );
  else if (!conversations.length)
    body = (
      <p className="px-3 py-2 text-sm text-muted-foreground">
        Dina chattar hamnar här.
      </p>
    );
  else
    body = (
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="px-3 pb-1 text-xs text-muted-foreground/70">
              {group.label}
            </h3>
            <ul className="space-y-px">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "group relative flex items-center rounded-lg transition-colors",
                    item.id === activeId ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <Link
                    to="/chatt/$conversationId"
                    params={{ conversationId: item.id }}
                    className="min-w-0 flex-1 py-1.5 pr-8 pl-3"
                    onClick={closeDrawer}
                  >
                    <p
                      className={cn(
                        "truncate text-sm text-foreground/90",
                        item.id === activeId && "text-foreground",
                      )}
                    >
                      <RowTitle conversation={item} />
                    </p>
                    {item.meta && (
                      <p className="truncate text-xs text-muted-foreground/70">
                        {item.meta}
                      </p>
                    )}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Alternativ för ${item.title}`}
                        className="absolute right-1 text-muted-foreground opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 md:opacity-0"
                      >
                        <EllipsisIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setPendingDelete(item)}
                      >
                        <Trash2Icon />
                        Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3">
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="LiU Tentor"
        >
          <LogoIcon className="size-8" />
          <span className="font-logo text-lg font-medium tracking-tighter">
            LiU Tentor
          </span>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Stäng sidopanelen"
              onClick={() => setOpen(false)}
            >
              <PanelLeftIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            Stäng sidopanelen
            <SidebarShortcutKbd />
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="shrink-0 px-2 pb-3">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-start gap-2 rounded-lg px-3"
        >
          <Link to="/chatt" onClick={closeDrawer}>
            <SquarePenIcon />
            Ny chatt
          </Link>
        </Button>
      </div>

      <nav
        aria-label="Tidigare chattar"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4"
      >
        <SidebarCourses onNavigate={closeDrawer} />
        {body}
      </nav>

      <div className="shrink-0 border-t px-2 py-2">
        {isSignedIn ? (
          <AccountRow />
        ) : (
          <div className="space-y-2 px-1 py-1">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Chattar sparas bara i den här webbläsaren. Logga in för att spara
              dem på ditt konto.
            </p>
            <div className="flex items-center justify-between gap-2">
              <AuthActions />
              <ChatSettingsMenu />
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}

/**
 * The open conversation's row follows the chat store, so a generated title
 * types itself out here in step with the chat header.
 */
function RowTitle({ conversation }: { conversation: Conversation }) {
  const liveTitle = useChatStore((s) =>
    s.currentConversationId === conversation.id && s.isConversationTitleReady
      ? s.currentConversationTitle
      : null,
  );
  const startedAt = useChatStore((s) =>
    s.titleTypesInSidebar ? s.titleTypingStartedAt : null,
  );
  if (!liveTitle) return conversation.title;
  return <TypedTitle title={liveTitle} startedAt={startedAt} />;
}

/** Who is signed in, opening the account menu, with settings beside it. */
function AccountRow() {
  const navigate = useNavigate();
  const { user, displayName } = useProfile();
  const name = displayName || user?.email;

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-accent/60"
          aria-label="Kontomeny"
        >
          <UserAvatar className="size-7 shrink-0" fallbackClassName="text-xs" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-foreground">
              {name}
            </span>
            {displayName && (
              <span className="block truncate text-xs text-muted-foreground">
                {user?.email}
              </span>
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuItem onSelect={() => void navigate({ to: "/me" })}>
            <UserIcon />
            Profil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => void signOut()}
          >
            <LogOutIcon />
            Logga ut
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChatSettingsMenu />
    </div>
  );
}
