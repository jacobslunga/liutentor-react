import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { m } from "framer-motion";
import {
  EllipsisIcon,
  LogOutIcon,
  PanelLeftIcon,
  SquarePenIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthActions } from "@/components/auth/auth-actions";
import { UserAvatar } from "@/components/auth/user-avatar";
import { TypedTitle } from "@/components/chat/conversation-title";
import { LogoIcon } from "@/components/layout/logo-icon";
import { ResizeEdge } from "@/components/shared/resize-edge";
import { RouterLinkButton } from "@/components/shared/router-link";
import { useConversationList } from "@/hooks/use-conversation-list";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/queries/conversations";
import { useProfile } from "@/queries/profile";
import { useChatStore } from "@/stores/chat";
import {
  isSidebarShortcut,
  sidebarWidth,
  useLearnSidebar,
} from "@/stores/learn-sidebar";
import { useSettingsStore } from "@/stores/settings";
import { ChatSettingsMenu } from "./chat-settings-menu";
import { SidebarCourses } from "./sidebar-courses";
import { SIDEBAR_SHORTCUT } from "./sidebar-shortcut";
import { IconButton } from "@/components/shared/icon-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChatSidebar() {
  const { inline, open, setOpen } = useLearnSidebar();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSidebarShortcut(e)) return;
      e.preventDefault();
      setOpen(!open);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (inline || !open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inline, open, setOpen]);

  if (inline) return <InlineSidebar open={open} />;

  return (
    <>
      <m.div
        aria-hidden
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        className={cn(
          "fixed inset-0 z-40 bg-black/40",
          !open && "pointer-events-none",
        )}
        onClick={() => setOpen(false)}
      />
      <m.aside
        aria-label="Chattar"
        aria-hidden={!open}
        inert={!open}
        className="fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] border-r bg-background shadow-lg"
        initial={false}
        animate={{ x: open ? "0%" : "-100%" }}
      >
        <SidebarContent />
      </m.aside>
    </>
  );
}

const MIN_WIDTH = 208;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 256;
const KEY_STEP = 16;

const clampWidth = (width: number) =>
  Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));

function InlineSidebar({ open }: { open: boolean }) {
  const storedWidth = useSettingsStore((s) => s.chatSidebarWidth);
  const setStoredWidth = useSettingsStore((s) => s.setChatSidebarWidth);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    document.body.style.removeProperty("cursor");
    setDragging(false);
    setStoredWidth(sidebarWidth.get());
  }

  return (
    <m.aside
      aria-label="Chattar"
      aria-hidden={!open}
      inert={!open}
      style={{ width: sidebarWidth }}
      initial={false}
      animate={{ x: open ? "0%" : "-100%" }}
      className={cn(
        "absolute inset-y-0 left-0 z-30 bg-background",
        !open && "pointer-events-none",
      )}
    >
      <div className="h-full border-r bg-sidebar">
        <SidebarContent />
      </div>
      {open && (
        <ResizeEdge
          active={dragging}
          role="separator"
          aria-orientation="vertical"
          aria-label="Sidopanelens bredd"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={storedWidth}
          tabIndex={0}
          className="absolute inset-y-0 right-0 z-10 translate-x-1/2"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              startX: e.clientX,
              startWidth: sidebarWidth.get(),
            };

            document.body.style.cursor = "col-resize";
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            sidebarWidth.set(
              clampWidth(
                drag.current.startWidth + e.clientX - drag.current.startX,
              ),
            );
          }}
          onPointerUp={endDrag}
          onLostPointerCapture={endDrag}
          onDoubleClick={() => setStoredWidth(DEFAULT_WIDTH)}
          onKeyDown={(e) => {
            const delta =
              e.key === "ArrowLeft"
                ? -KEY_STEP
                : e.key === "ArrowRight"
                  ? KEY_STEP
                  : 0;
            if (!delta) return;
            e.preventDefault();
            setStoredWidth(clampWidth(storedWidth + delta));
          }}
        />
      )}
    </m.aside>
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
                      <IconButton
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Alternativ för ${item.title}`}
                        hideTooltip
                        className="absolute right-1 opacity-100 group-hover:opacity-100 aria-expanded:opacity-100 md:opacity-0"
                      >
                        <EllipsisIcon />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-48">
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
        <IconButton
          variant="ghost"
          aria-label="Stäng sidopanelen"
          shortcut={SIDEBAR_SHORTCUT}
          onClick={() => setOpen(false)}
        >
          <PanelLeftIcon />
        </IconButton>
      </div>

      <div className="shrink-0 px-2 pb-3">
        <RouterLinkButton
          to="/chatt"
          variant="ghost"
          className="w-full justify-start"
          onClick={closeDrawer}
        >
          <SquarePenIcon />
          Ny chatt
        </RouterLinkButton>
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
    </div>
  );
}

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

function AccountRow() {
  const navigate = useNavigate();
  const { user, displayName } = useProfile();
  const name = displayName || user?.email;

  return (
    <div className="flex items-center gap-1 select-none">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-accent/60"
            aria-label="Kontomeny"
          >
            <UserAvatar
              className="size-7 shrink-0"
              fallbackClassName="text-xs"
            />
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
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64">
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
