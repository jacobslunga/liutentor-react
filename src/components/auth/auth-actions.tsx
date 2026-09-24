import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { UserDropdown } from "./user-dropdown";

export function AuthActions({
  largerOnDesktop = false,
  showSettings = false,
}: {
  largerOnDesktop?: boolean;
  showSettings?: boolean;
}) {
  const ready = useAuthStore((s) => s.ready);
  const signedIn = useAuthStore((s) => !!s.user);
  const size = largerOnDesktop ? "lg:h-9 lg:px-4 lg:text-sm" : undefined;

  if (!ready) return null;

  const settings = showSettings && <SettingsDialog />;

  if (signedIn) {
    return (
      <div className="flex items-center gap-2">
        {settings}
        <UserDropdown />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {settings}
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
