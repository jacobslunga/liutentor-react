import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppFooter } from "@/components/layout/app-footer";

export const Route = createFileRoute("/_default")({
  component: DefaultLayout,
});

function DefaultLayout() {
  return (
    <div className="flex min-h-dvh max-w-full flex-col bg-background">
      <main className="grow">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
