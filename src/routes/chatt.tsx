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

  useSeo({
    title: "Chatt",
    description: "Plugga med AI. Referera till en kurs med @kurskod.",
    path: "/chatt",
    robots: "noindex, nofollow",
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
