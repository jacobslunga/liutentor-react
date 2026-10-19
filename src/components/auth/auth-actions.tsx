import { RouterLinkButton } from "@/components/shared/router-link";
import { useAuthStore } from "@/stores/auth";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { UserDropdown } from "./user-dropdown";
import { useRouterState } from "@tanstack/react-router";

export function AuthActions({
  largerOnDesktop = false,
  showSettings = false,
}: {
  largerOnDesktop?: boolean;
  showSettings?: boolean;
}) {
  const ready = useAuthStore((s) => s.ready);
  const returnTo = useRouterState({ select: (s) => s.location.href });
  const signedIn = useAuthStore((s) => !!s.user);
  const size = largerOnDesktop ? "default" : "sm";

  if (!ready) return null;

  const settings = showSettings && <SettingsDialog />;

  if (signedIn) return <UserDropdown />;

  return (
    <div className="flex items-center gap-2">
      <RouterLinkButton
        variant="outline"
        to="/logga-in"
        search={{ redirect: returnTo }}
        size={size}
      >
        Logga in
      </RouterLinkButton>
      <RouterLinkButton
        to="/logga-in"
        search={{ tab: "skapa-konto", redirect: returnTo }}
        size={size}
      >
        Skapa konto
      </RouterLinkButton>
      {settings}
    </div>
  );
}
