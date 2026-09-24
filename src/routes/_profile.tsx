import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect } from "react";
import { LogoIcon } from "@/components/layout/logo-icon";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/hooks/use-seo";
import { getUser, useUser } from "@/stores/auth";

export const Route = createFileRoute("/_profile")({
  beforeLoad: async () => {
    if (!(await getUser())) throw redirect({ to: "/logga-in", replace: true });
  },
  component: ProfileLayout,
});

function ProfileLayout() {
  useSeo({
    title: "Min profil",
    description: "Hantera din profil på LiU Tentor.",
    path: "/me",
    robots: "noindex, nofollow",
  });
  const router = useRouter();
  const navigate = useNavigate();
  const user = useUser();

  // Signing out on this page leaves it.
  useEffect(() => {
    if (!user) void navigate({ to: "/logga-in", replace: true });
  }, [user, navigate]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 w-full">
        <div className="absolute inset-0 -z-10 bg-background/80 mask-[linear-gradient(to_bottom,black,transparent)] backdrop-blur-sm" />
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => router.history.back()}
          >
            <ArrowLeftIcon />
            Tillbaka
          </Button>
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <LogoIcon className="size-7" />
            <span className="font-logo text-lg font-medium tracking-tighter">
              LiU Tentor
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
