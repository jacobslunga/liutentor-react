import { RouterLinkButton } from "@/components/primer/router-link-button";
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
  const size = largerOnDesktop ? "medium" : "small";

  if (!ready) return null;

  const settings = showSettings && <SettingsDialog />;

  // Signed in, settings live in the account menu.
  if (signedIn) return <UserDropdown />;

  return (
    <div className="flex items-center gap-2">
      {settings}
      <RouterLinkButton to="/logga-in" size={size}>
        Logga in
      </RouterLinkButton>
      <RouterLinkButton
        to="/logga-in"
        search={{ tab: "skapa-konto" }}
        size={size}
        variant="primary"
      >
        Skapa konto
      </RouterLinkButton>
    </div>
  );
}
