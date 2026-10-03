import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { AppLoadingBar } from "@/components/layout/app-loading-bar";
import { AnalyticsConsent } from "@/components/layout/analytics-consent";
import { ChatIntroDialog } from "@/components/layout/chat-intro-dialog";
import { RouterLinkButton } from "@/components/shared/router-link";
import { Toaster } from "@/components/ui/sonner";
import { ExamUploadDialog } from "@/components/upload/exam-upload-dialog";
import { useSeo } from "@/hooks/use-seo";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <AppLoadingBar />
      <Outlet />
      <ExamUploadDialog />
      <AnalyticsConsent />
      <ChatIntroDialog />
      <Toaster position="top-center" duration={4000} />
    </>
  );
}

function NotFound() {
  useSeo({
    title: "404 – Sidan hittades inte",
    description: "Sidan du letar efter finns inte.",
    robots: "noindex, nofollow",
  });
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Sidan finns inte</h1>
      <p className="text-sm text-muted-foreground">
        Sidan du letar efter har flyttats eller finns inte.
      </p>
      <RouterLinkButton to="/" variant="outline">
        Till startsidan
      </RouterLinkButton>
    </div>
  );
}
