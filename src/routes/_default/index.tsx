import { createFileRoute } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import { AuthActions } from "@/components/auth/auth-actions";
import { LogoIcon } from "@/components/layout/logo-icon";
import { HeroCourseSearch } from "@/components/search/course-search";
import { RecentSearches } from "@/components/search/recent-searches";
import { Button } from "@/components/ui/button";
import { useUploadModal } from "@/stores/upload-modal";

export const Route = createFileRoute("/_default/")({
  component: HomePage,
});

function HomePage() {
  const openUploadModal = useUploadModal((s) => s.open);

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-start bg-background p-4 pt-[20dvh]">
      <div className="absolute top-5 right-5 flex flex-row items-center justify-center gap-2">
        <AuthActions largerOnDesktop />
      </div>

      <div className="mb-20 flex w-full max-w-150 flex-col items-center gap-6">
        <div className="flex flex-row items-center justify-center space-x-2">
          <LogoIcon className="h-12 w-12 md:h-14 md:w-14 lg:h-24 lg:w-24" />
          <h1 className="font-logo text-4xl font-medium tracking-tighter lg:text-5xl">
            LiU Tentor
          </h1>
        </div>

        <HeroCourseSearch />

        <RecentSearches />

        <Button variant="outline" onClick={() => openUploadModal()}>
          <UploadIcon data-icon="inline-start" />
          Ladda upp fler tentor
        </Button>
      </div>
    </div>
  );
}
