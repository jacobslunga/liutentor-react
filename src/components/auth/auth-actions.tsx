import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

export function AuthActions({ largerOnDesktop = false }: { largerOnDesktop?: boolean }) {
  const ready = useAuthStore((s) => s.ready);
  const signedIn = useAuthStore((s) => !!s.user);
  const size = largerOnDesktop ? "lg:h-9 lg:px-4 lg:text-sm" : undefined;

  if (!ready) return null;

  // Replaced by the user dropdown when auth and profile land.
  if (signedIn) {
    return (
      <Button asChild size="sm" variant="outline" className={cn(size)}>
        <Link to="/me">Profil</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline" className={cn(size)}>
        <Link to="/logga-in">Logga in</Link>
      </Button>
      <Button asChild size="sm" className={cn(size)}>
        <Link to="/logga-in" search={{ tab: "skapa-konto" }}>
          Skapa konto
        </Link>
      </Button>
    </div>
  );
}
