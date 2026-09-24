import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppFooter } from "@/components/layout/app-footer";
import { LogoIcon } from "@/components/layout/logo-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadModal } from "@/stores/upload-modal";

export const Route = createFileRoute("/_info")({
  component: InfoLayout,
});

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

function InfoLayout() {
  const scrolled = useScrolled();
  const openUploadModal = useUploadModal((s) => s.open);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header
        className={cn(
          "sticky top-0 z-30 h-14 shrink-0 border-b bg-background transition-colors duration-200",
          scrolled ? "border-border" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-70"
          >
            <LogoIcon className="size-6" />
            <span className="font-logo text-lg font-medium tracking-tighter">
              LiU Tentor
            </span>
          </Link>

          <Button variant="outline" size="sm" onClick={() => openUploadModal()}>
            <UploadIcon />
            <span className="hidden sm:inline">Ladda upp tenta</span>
            <span className="sm:hidden">Ladda upp</span>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
