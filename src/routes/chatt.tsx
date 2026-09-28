import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/learn/chat-sidebar";
import { LearnChat } from "@/components/learn/learn-chat";
import { useSeo } from "@/hooks/use-seo";
import { ChatStoreContext, learnChatStore } from "@/stores/chat";

export const Route = createFileRoute("/chatt")({
  component: LearnLayout,
});

/**
 * The learning chat: conversation sidebar beside the open chat. The chat is
 * rendered here rather than by the child routes so that moving from /chatt to
 * /chatt/$conversationId after the first turn keeps the streaming reply alive.
 */
function LearnLayout() {
  const params = useParams({ strict: false });
  const conversationId = params.conversationId ?? null;
  const courseId = params.courseId ?? null;

  // /chatt itself is a public landing page; single chats and courses are
  // private to their owner and stay out of search results.
  useSeo({
    title: "Chatt – plugga med AI",
    description:
      "Plugga med AI på LiU Tentor. Ställ frågor om dina kurser, skriv @kurskod för att prata om en viss kurs och få svar med källor ur dina egna föreläsningar.",
    path: "/chatt",
    robots:
      conversationId || courseId ? "noindex, nofollow" : "index, follow",
  });

  return (
    <ChatStoreContext.Provider value={learnChatStore}>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        <ChatSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <LearnChat conversationId={conversationId} courseId={courseId} />
        </main>
      </div>
    </ChatStoreContext.Provider>
  );
}
