import type { QueryClient } from "@tanstack/react-query";
import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { AppLoadingBar } from "@/components/layout/app-loading-bar";
import { Button } from "@/components/ui/button";
import { ExamUploadDialog } from "@/components/upload/exam-upload-dialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <TooltipProvider delayDuration={200}>
      <AppLoadingBar />
      <Outlet />
      <ExamUploadDialog />
      <Toaster position="top-center" duration={4000} />
    </TooltipProvider>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sidan finns inte</h1>
      <p className="text-sm text-muted-foreground">
        Sidan du letar efter har flyttats eller finns inte.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Till startsidan</Link>
      </Button>
    </div>
  );
}
