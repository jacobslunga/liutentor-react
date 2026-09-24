import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const Route = createFileRoute("/_profile/me")({
  component: () => <PlaceholderPage title="Profil" />,
});
