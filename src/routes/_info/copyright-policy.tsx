import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const Route = createFileRoute("/_info/copyright-policy")({
  component: () => <PlaceholderPage title="Upphovsrätt" />,
});
