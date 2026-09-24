import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL; quizzes are not part of v1.
export const Route = createFileRoute("/quiz/$courseCode")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/search/$courseCode",
      params: { courseCode: params.courseCode },
      replace: true,
    });
  },
});
