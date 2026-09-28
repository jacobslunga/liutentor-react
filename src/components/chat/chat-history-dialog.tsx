import { LoaderCircleIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  groupConversations,
  loadMessages,
  useConversationList,
} from "@/hooks/use-conversation-list";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/queries/conversations";
import { useChatStore, useChatStoreApi } from "@/stores/chat";

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
        titleTypingStartedAt: null,
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
                    <span role="status" className="flex size-7 shrink-0 items-center justify-center text-muted-foreground">
                      <LoaderCircleIcon className="size-4 animate-spin" />
                      <span className="sr-only">Laddar konversation...</span>
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground/60 transition-opacity hover:text-destructive sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
                    disabled={deleting}
                    aria-label="Radera chatt"
                    onClick={() => setPendingDelete(item)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) setSearch("");
        }}
      >
        <DialogContent className="flex h-[min(40rem,calc(100dvh-2rem))] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chatthistorik</DialogTitle>
            <DialogDescription>
              {isSignedIn
                ? "Sök och öppna tidigare chattar"
                : "Sparas bara i den här webbläsaren. Logga in för att spara dem på ditt konto."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök bland chattar..."
              />
            </InputGroup>
            {conversations.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                disabled={deleting}
                aria-label="Radera alla chattar"
                onClick={() => setPendingDelete("all")}
              >
                <Trash2Icon />
              </Button>
            )}
          </div>
          {actionError && <p className="px-2 text-sm text-destructive">{actionError}</p>}
          <div className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">{body}</div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(value) => !value && !deleting && setPendingDelete(null)}>
        <AlertDialogContent className="data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete === "all" ? "Radera all historik?" : "Är du säker?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete === "all"
                ? `Alla ${conversations.length} chattar kommer att raderas permanent. Det går inte att ångra.`
                : "Den här chatten kommer att raderas permanent och kan inte ångras."}
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
              {deleting ? "Raderar..." : pendingDelete === "all" ? "Radera alla" : "Radera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
