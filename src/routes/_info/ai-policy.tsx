import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const Route = createFileRoute("/_info/ai-policy")({
  component: () => <PlaceholderPage title="AI-policy" />,
});
