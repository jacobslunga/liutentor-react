import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const Route = createFileRoute("/_info/upload-exams")({
  component: () => <PlaceholderPage title="Ladda upp tentor" />,
});
