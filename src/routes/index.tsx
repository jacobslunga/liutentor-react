import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <img src="/images/logo-light.svg" alt="Logo" className="h-12 dark:hidden" />
      <img src="/images/logo-dark.svg" alt="Logo" className="hidden h-12 dark:block" />
      <h1 className="font-logo text-4xl">LiU Tentor</h1>
      <Button>Kom igång</Button>
    </main>
  );
}
