import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export type AuthTab = "logga-in" | "skapa-konto";

export const Route = createFileRoute("/_auth/logga-in")({
  validateSearch: (search: Record<string, unknown>): { tab?: AuthTab } => ({
    tab: search.tab === "skapa-konto" ? "skapa-konto" : undefined,
  }),
  component: () => <PlaceholderPage title="Logga in" />,
});
