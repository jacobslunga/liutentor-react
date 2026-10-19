import {
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect } from "react";
import { AppFooter } from "@/components/layout/app-footer";
import { getUser, useUser } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { validateAuthRedirect } from "@/lib/auth-redirect";

export const Route = createFileRoute("/_auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: validateAuthRedirect(search.redirect),
  }),
  beforeLoad: async ({ search }) => {
    if (await getUser())
      throw redirect({ href: search.redirect ?? "/", replace: true });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const user = useUser();
  const { redirect: returnTo } = Route.useSearch();

  useEffect(() => {
    if (user) void router.navigate({ href: returnTo ?? "/", replace: true });
  }, [user, router, returnTo]);

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
