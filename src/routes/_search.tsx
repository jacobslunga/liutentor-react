import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppFooter } from "@/components/layout/app-footer";
import { SearchHeader } from "@/components/layout/search-header";

export const Route = createFileRoute("/_search")({
  component: SearchLayout,
});

function SearchLayout() {
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <SearchHeader />
      <main className="relative flex w-full max-w-full grow flex-col">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
