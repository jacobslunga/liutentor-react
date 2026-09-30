import {
  ActionList,
  ActionMenu,
  ConfirmationDialog,
  IconButton,
} from "@primer/react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
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
import { RouterLinkButton } from "@/components/primer/router-link-button";
import { useConversationList } from "@/hooks/use-conversation-list";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/queries/conversations";
import { useProfile } from "@/queries/profile";
import { useChatStore } from "@/stores/chat";
import { isSidebarShortcut, useLearnSidebar } from "@/stores/learn-sidebar";
import { useSettingsStore } from "@/stores/settings";
import { ChatSettingsMenu } from "./chat-settings-menu";
import { SidebarCourses } from "./sidebar-courses";
import { SIDEBAR_SHORTCUT } from "./sidebar-shortcut";

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

  if (inline) return <InlineSidebar open={open} />;

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

const MIN_WIDTH = 208;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 256;
const KEY_STEP = 16;

const clampWidth = (width: number) =>
  Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));

/**
 * The sidebar beside the chat. Its right edge drags to resize, with no visible
 * grip; double-click resets it. The width is remembered across visits.
 */
function InlineSidebar({ open }: { open: boolean }) {
  const storedWidth = useSettingsStore((s) => s.chatSidebarWidth);
  const setStoredWidth = useSettingsStore((s) => s.setChatSidebarWidth);
  // While dragging, the width lives here and is saved once on release.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const width = dragWidth ?? storedWidth;
  const dragging = dragWidth !== null;

  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    document.body.style.removeProperty("cursor");
    if (dragWidth !== null) setStoredWidth(dragWidth);
    setDragWidth(null);
  }

  return (
    <aside
      aria-label="Chattar"
      style={{ width: open ? width : 0 }}
      className={cn(
        "relative shrink-0 overflow-hidden border-r bg-muted/30",
        // Animate opening and closing, but follow the pointer 1:1 while dragging.
        !dragging && "transition-[width] duration-200 ease-out",
        !open && "border-r-0",
      )}
    >
      <div className="h-full" style={{ width }}>
        <SidebarContent />
      </div>
      {open && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Sidopanelens bredd"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={width}
          tabIndex={0}
          className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none outline-none select-none focus-visible:bg-ring"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { startX: e.clientX, startWidth: width };
            // Keep the resize cursor even when the pointer outruns the edge.
            document.body.style.cursor = "col-resize";
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setDragWidth(
              clampWidth(drag.current.startWidth + e.clientX - drag.current.startX),
            );
          }}
          onPointerUp={endDrag}
          onLostPointerCapture={endDrag}
          onDoubleClick={() => setStoredWidth(DEFAULT_WIDTH)}
          onKeyDown={(e) => {
            const delta =
              e.key === "ArrowLeft" ? -KEY_STEP : e.key === "ArrowRight" ? KEY_STEP : 0;
            if (!delta) return;
            e.preventDefault();
            setStoredWidth(clampWidth(storedWidth + delta));
          }}
        />
      )}
    </aside>
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
                  <ActionMenu>
                    <ActionMenu.Anchor>
                      <IconButton
                        icon={EllipsisIcon}
                        variant="invisible"
                        size="small"
                        aria-label={`Alternativ för ${item.title}`}
                        unsafeDisableTooltip
                        className="absolute right-1 opacity-100 group-hover:opacity-100 aria-expanded:opacity-100 md:opacity-0"
                      />
                    </ActionMenu.Anchor>
                    <ActionMenu.Overlay align="start" width="small">
                      <ActionList>
                        <ActionList.Item
                          variant="danger"
                          onSelect={() => setPendingDelete(item)}
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
          icon={PanelLeftIcon}
          variant="invisible"
          aria-label="Stäng sidopanelen"
          keybindingHint={SIDEBAR_SHORTCUT}
          onClick={() => setOpen(false)}
        />
      </div>

      <div className="shrink-0 px-2 pb-3">
        <RouterLinkButton
          to="/chatt"
          variant="invisible"
          block
          alignContent="start"
          leadingVisual={SquarePenIcon}
          onClick={closeDrawer}
        >
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
        <ConfirmationDialog
          title="Radera chatten?"
          cancelButtonContent="Avbryt"
          confirmButtonContent="Radera"
          confirmButtonType="danger"
          confirmButtonLoading={deleting}
          onClose={(gesture) => {
            if (deleting) return;
            if (gesture === "confirm") void confirmDelete();
            else setPendingDelete(null);
          }}
        >
          "{pendingDelete.title}" raderas permanent och kan inte ångras.
        </ConfirmationDialog>
      )}
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
      <ActionMenu>
        <ActionMenu.Anchor>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-accent/60"
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
          </button>
        </ActionMenu.Anchor>
        <ActionMenu.Overlay side="outside-top" align="start" width="medium">
          <ActionList>
            <ActionList.Item onSelect={() => void navigate({ to: "/me" })}>
              <ActionList.LeadingVisual>
                <UserIcon />
              </ActionList.LeadingVisual>
              Profil
            </ActionList.Item>
            <ActionList.Divider />
            <ActionList.Item variant="danger" onSelect={() => void signOut()}>
              <ActionList.LeadingVisual>
                <LogOutIcon />
              </ActionList.LeadingVisual>
              Logga ut
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
      <ChatSettingsMenu />
    </div>
  );
}
