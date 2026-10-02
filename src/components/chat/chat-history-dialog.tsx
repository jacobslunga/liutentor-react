import { ConfirmationDialog, Dialog, Spinner, TextInput } from "@primer/react";
import { SearchIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  groupConversations,
  loadMessages,
  useConversationList,
} from "@/hooks/use-conversation-list";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/queries/conversations";
import { useChatStore, useChatStoreApi } from "@/stores/chat";
import { IconButton } from "@/components/shared/icon-button";

interface ChatHistoryDialogProps {
  onSelect: () => void;
}

/**
 * Search, open and delete saved conversations: from the server when signed
 * in, from this browser otherwise.
 */
export function ChatHistoryDialog({ onSelect }: ChatHistoryDialogProps) {
  const chatStore = useChatStoreApi();
  const open = useChatStore((s) => s.isHistoryOpen);
  const setOpen = useChatStore((s) => s.setHistoryOpen);
  const currentId = useChatStore((s) => s.currentConversationId);
  const { conversations, isPending, isError, isSignedIn, remove } = useConversationList("exam", {
    enabled: open,
  });

  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Conversation | "all" | null>(null);
  const [deleting, setDeleting] = useState(false);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((c) => c.title.toLowerCase().includes(q) || c.meta.toLowerCase().includes(q))
      : conversations;
    return groupConversations(filtered);
  }, [conversations, search]);

  async function openConversation(item: Conversation) {
    if (openingId) return;
    setOpeningId(item.id);
    setActionError(null);
    try {
      const messages = await loadMessages(item.id);
      if (!messages.length) {
        setActionError("Den här chatten har inga sparade meddelanden än.");
        return;
      }
      chatStore.setState({
        messages,
        currentConversationId: item.id,
        currentConversationTitle: item.title,
        isConversationTitleReady: true,
        // The header types the title in, as in the learning chat. This runs in
        // a click handler, not during render.
        // oxlint-disable-next-line react/purity
        titleTypingStartedAt: performance.now(),
        savedScrollPosition: null,
        isHistoryOpen: false,
      });
      onSelect();
    } catch {
      setActionError("Kunde inte öppna konversationen.");
    } finally {
      setOpeningId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    const ids = pendingDelete === "all" ? conversations.map((c) => c.id) : [pendingDelete.id];
    setDeleting(true);
    setActionError(null);
    try {
      await remove(ids);
      const current = chatStore.getState().currentConversationId;
      if (current && ids.includes(current)) {
        chatStore.setState({
          messages: [],
          currentConversationId: null,
          currentConversationTitle: null,
          isConversationTitleReady: false,
          titleTypingStartedAt: null,
          savedScrollPosition: null,
          isLoading: false,
        });
      }
      toast.success(pendingDelete === "all" ? "Alla chattar raderades" : "Chatten raderades");
      setPendingDelete(null);
    } catch {
      setActionError(pendingDelete === "all" ? "Kunde inte radera alla chattar." : "Kunde inte radera chatten.");
    } finally {
      setDeleting(false);
    }
  }

  let body;
  if (isPending) body = <p className="px-2 py-4 text-sm text-muted-foreground">Hämtar historik...</p>;
  else if (isError) body = <p className="px-2 py-4 text-sm text-destructive">Kunde inte hämta konversationshistorik.</p>;
  else if (!groups.length)
    body = (
      <p className="px-2 py-4 text-sm text-muted-foreground">
        {search.trim() ? `Inga chattar matchar "${search.trim()}".` : "Inga chattar hittades."}
      </p>
    );
  else
    body = (
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="px-3 pb-1.5 text-sm text-muted-foreground/60">{group.label}</h3>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-1 transition-colors",
                    item.id === currentId ? "bg-muted" : "hover:bg-accent",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 px-2 py-1.5 text-left"
                    disabled={!!openingId || deleting}
                    aria-busy={openingId === item.id}
                    onClick={() => void openConversation(item)}
                  >
                    <p className={cn("truncate text-sm text-foreground/90", item.id === currentId && "font-medium")}>
                      {item.title}
                    </p>
                    {item.meta && <p className="truncate text-xs text-muted-foreground/70">{item.meta}</p>}
                  </button>
                  {openingId === item.id && (
                    <span className="flex size-7 shrink-0 items-center justify-center">
                      <Spinner size="small" srText="Laddar konversation..." />
                    </span>
                  )}
                  <IconButton variant="ghost" size="icon-sm" className="shrink-0 transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100" disabled={deleting} aria-label="Radera chatt" onClick={() => setPendingDelete(item)}><Trash2Icon /></IconButton>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );

  function close() {
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      {open && (
        <Dialog
          width="large"
          height="large"
          onClose={close}
          renderHeader={({ dialogLabelId, dialogDescriptionId }) => (
            <Dialog.Header>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Dialog.Title id={dialogLabelId}>Chatthistorik</Dialog.Title>
                  <Dialog.Subtitle id={dialogDescriptionId}>
                    {isSignedIn
                      ? "Sök och öppna tidigare chattar"
                      : "Sparas bara i den här webbläsaren. Logga in för att spara dem på ditt konto."}
                  </Dialog.Subtitle>
                </div>
                <Dialog.CloseButton onClose={close} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <TextInput
                  block
                  leadingVisual={SearchIcon}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Sök bland chattar..."
                  aria-label="Sök bland chattar"
                />
                {conversations.length > 0 && (
                  <IconButton variant="destructive" disabled={deleting} aria-label="Radera alla chattar" onClick={() => setPendingDelete("all")}><Trash2Icon /></IconButton>
                )}
              </div>
              {actionError && <p className="pt-2 text-sm text-destructive">{actionError}</p>}
            </Dialog.Header>
          )}
        >
          {body}
        </Dialog>
      )}

      {pendingDelete && (
        <ConfirmationDialog
          title={pendingDelete === "all" ? "Radera all historik?" : "Är du säker?"}
          cancelButtonContent="Avbryt"
          confirmButtonContent={pendingDelete === "all" ? "Radera alla" : "Radera"}
          confirmButtonType="danger"
          confirmButtonLoading={deleting}
          onClose={(gesture) => {
            if (deleting) return;
            if (gesture === "confirm") void confirmDelete();
            else setPendingDelete(null);
          }}
        >
          {pendingDelete === "all"
            ? `Alla ${conversations.length} chattar kommer att raderas permanent. Det går inte att ångra.`
            : "Den här chatten kommer att raderas permanent och kan inte ångras."}
        </ConfirmationDialog>
      )}
    </>
  );
}
