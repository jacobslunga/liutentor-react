import { Outlet, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect } from "react";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { getUser, useUser } from "@/stores/auth";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    if (await getUser()) throw redirect({ to: "/", replace: true });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const navigate = useNavigate();
  const user = useUser();

  // Signing in on this page leaves it.
  useEffect(() => {
    if (user) void navigate({ to: "/", replace: true });
  }, [user, navigate]);

  return (
    <>
      <div className="flex min-h-dvh max-w-full flex-col bg-background">
        <main className="flex grow items-start justify-center px-4 pt-20 pb-8 sm:px-8 sm:pt-24">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-5 left-5"
            onClick={() => router.history.back()}
          >
            <ArrowLeftIcon />
            Tillbaka
          </Button>
          <Outlet />
        </main>
      </div>
      <AppFooter />
    </>
  );
}
