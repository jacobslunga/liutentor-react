import { createFileRoute, redirect } from "@tanstack/react-router";


export const Route = createFileRoute("/quiz/$courseCode")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/search/$courseCode",
      params: { courseCode: params.courseCode },
      search: { tab: "quiz" },
      replace: true,
    });
  },
});
