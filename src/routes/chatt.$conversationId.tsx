import { createFileRoute } from "@tanstack/react-router";

// A saved chat. The layout route renders it from the param (see chatt.tsx).
export const Route = createFileRoute("/chatt/$conversationId")({});
