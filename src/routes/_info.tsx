import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import { AppFooter } from "@/components/layout/app-footer";
import { Logo } from "@/components/layout/logo";
import { InfoNavigation } from "@/components/layout/info-navigation";
import { useUploadModal } from "@/stores/upload-modal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_info")({
  component: InfoLayout,
});

function InfoLayout() {
  const openUploadModal = useUploadModal((s) => s.open);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 shrink-0 bg-background/75 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-70"
          >
            <Logo iconClassName="size-6" />
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openUploadModal()}
            >
              <UploadIcon />
              <span className="hidden sm:inline">Ladda upp tenta</span>
              <span className="sm:hidden">Ladda upp</span>
            </Button>
            <InfoNavigation />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
