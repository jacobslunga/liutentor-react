import { createFileRoute } from "@tanstack/react-router";

// A study course's page. The layout route renders it (see chatt.tsx).
export const Route = createFileRoute("/chatt/kurs/$courseId")({});
