import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const Route = createFileRoute("/search/$courseCode/$examId")({
  component: ExamPage,
});

function ExamPage() {
  const { courseCode, examId } = Route.useParams();
  return <PlaceholderPage title={`${courseCode} · ${examId}`} />;
}
