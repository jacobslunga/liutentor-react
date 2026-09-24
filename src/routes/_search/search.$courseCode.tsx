import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const Route = createFileRoute("/_search/search/$courseCode")({
  component: CoursePage,
});

function CoursePage() {
  const { courseCode } = Route.useParams();
  return <PlaceholderPage title={courseCode} />;
}
