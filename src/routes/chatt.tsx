import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChatMotion } from "@/components/chat/chat-motion";
import { ChatSidebar } from "@/components/learn/chat-sidebar";
import { LearnChat } from "@/components/learn/learn-chat";
import { useSeo } from "@/hooks/use-seo";
import { ChatStoreContext, learnChatStore } from "@/stores/chat";

export const Route = createFileRoute("/chatt")({
  component: LearnLayout,
});

function LearnLayout() {
  const params = useParams({ strict: false });
  const conversationId = params.conversationId ?? null;
  const courseId = params.courseId ?? null;

  useSeo({
    title: "Chatt – plugga med AI",
    description:
      "Plugga med AI på LiU Tentor. Ställ frågor om dina kurser, skriv @kurskod för att prata om en viss kurs och få svar med källor ur dina egna föreläsningar.",
    path: "/chatt",
    robots: conversationId || courseId ? "noindex, nofollow" : "index, follow",
  });

  return (
    <ChatStoreContext.Provider value={learnChatStore}>
      <ChatMotion>
        <div className="relative flex h-dvh w-full overflow-hidden bg-background">
          <ChatSidebar />
          <main className="relative flex w-full min-w-0 flex-col">
            <LearnChat conversationId={conversationId} courseId={courseId} />
          </main>
        </div>
      </ChatMotion>
    </ChatStoreContext.Provider>
  );
}
