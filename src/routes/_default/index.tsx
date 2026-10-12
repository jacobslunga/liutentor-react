import { createFileRoute } from "@tanstack/react-router";
import { HeaderActions } from "@/components/layout/header-actions";
import { Logo } from "@/components/layout/logo";
import { HeroCourseSearch } from "@/components/search/course-search";
import { RecentSearches } from "@/components/search/recent-searches";
import { useSeo } from "@/hooks/use-seo";

export const Route = createFileRoute("/_default/")({
  component: HomePage,
});

function HomePage() {
  useSeo({
    title: "Sök tentor",
    description: "Hitta och plugga på gamla tentor från Linköpings universitet",
    path: "/",
  });

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-start bg-background p-4 pt-[20dvh]">
      <HeaderActions className="absolute top-5 right-5" />

      <div className="mb-20 flex w-full max-w-150 flex-col items-center gap-6">
        <h1>
          <Logo
            className="justify-center"
            iconClassName="h-12 w-12 md:h-14 md:w-14 lg:h-24 lg:w-24"
            textClassName="text-4xl lg:text-5xl"
          />
        </h1>

        <HeroCourseSearch />

        <RecentSearches />
      </div>
    </div>
  );
}
