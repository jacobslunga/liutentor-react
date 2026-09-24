import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/skapa-konto")({
  beforeLoad: () => {
    throw redirect({
      to: "/logga-in",
      search: { tab: "skapa-konto" },
      replace: true,
    });
  },
});
