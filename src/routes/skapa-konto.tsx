import { createFileRoute, redirect } from "@tanstack/react-router";
import { validateAuthRedirect } from "@/lib/auth-redirect";

export const Route = createFileRoute("/skapa-konto")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: validateAuthRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/logga-in",
      search: { tab: "skapa-konto", redirect: search.redirect },
      replace: true,
    });
  },
});
