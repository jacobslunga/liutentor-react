import { ActionList, ActionMenu } from "@primer/react";
import { useNavigate } from "@tanstack/react-router";
import {
  CircleHelpIcon,
  InfoIcon,
  LogOutIcon,
  MessageSquareIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { signOut } from "@/lib/auth";
import { useProfile } from "@/queries/profile";
import { UserAvatar } from "./user-avatar";

const THEMES = [
  { value: "light", label: "Ljust", Icon: SunIcon },
  { value: "dark", label: "Mörkt", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
] as const;

/**
 * The account menu behind the avatar, after GitHub's: who you are, your
 * pages, settings and appearance, help, and signing out.
 */
export function UserDropdown() {
  const navigate = useNavigate();
  const { user, displayName } = useProfile();
  const { theme = "system", setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const themeLabel = THEMES.find((t) => t.value === theme)?.label ?? "System";

  return (
    <>
      <ActionMenu>
        <ActionMenu.Anchor>
          <button
            type="button"
            className="rounded-full transition-opacity hover:opacity-80"
            aria-label="Kontomeny"
          >
            <UserAvatar className="size-10" />
          </button>
        </ActionMenu.Anchor>
        <ActionMenu.Overlay align="end" width="medium">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <UserAvatar className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName || user?.email}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {displayName ? user?.email : "Inloggad"}
              </p>
            </div>
          </div>
          <ActionList>
            <ActionList.Divider />
            <ActionList.Item onSelect={() => void navigate({ to: "/me" })}>
              <ActionList.LeadingVisual>
                <UserIcon />
              </ActionList.LeadingVisual>
              Profil
            </ActionList.Item>
            <ActionList.Divider />
            <ActionList.Item onSelect={() => setSettingsOpen(true)}>
              <ActionList.LeadingVisual>
                <SettingsIcon />
              </ActionList.LeadingVisual>
              Inställningar
            </ActionList.Item>
            <ActionMenu>
              <ActionMenu.Anchor>
                <ActionList.Item>
                  <ActionList.LeadingVisual>
                    <PaletteIcon />
                  </ActionList.LeadingVisual>
                  Utseende
                  <ActionList.TrailingVisual>{themeLabel}</ActionList.TrailingVisual>
                </ActionList.Item>
              </ActionMenu.Anchor>
              <ActionMenu.Overlay width="small">
                <ActionList selectionVariant="single">
                  {THEMES.map(({ value, label, Icon }) => (
                    <ActionList.Item
                      key={value}
                      selected={theme === value}
                      onSelect={() => setTheme(value)}
                    >
                      <ActionList.LeadingVisual>
                        <Icon />
                      </ActionList.LeadingVisual>
                      {label}
                    </ActionList.Item>
                  ))}
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
            <ActionList.Divider />
            <ActionList.Item onSelect={() => void navigate({ to: "/faq" })}>
              <ActionList.LeadingVisual>
                <CircleHelpIcon />
              </ActionList.LeadingVisual>
              Vanliga frågor
            </ActionList.Item>
            <ActionList.Item onSelect={() => void navigate({ to: "/feedback" })}>
              <ActionList.LeadingVisual>
                <MessageSquareIcon />
              </ActionList.LeadingVisual>
              Skicka feedback
            </ActionList.Item>
            <ActionList.Item onSelect={() => void navigate({ to: "/om-oss" })}>
              <ActionList.LeadingVisual>
                <InfoIcon />
              </ActionList.LeadingVisual>
              Om LiU Tentor
            </ActionList.Item>
            <ActionList.Divider />
            <ActionList.Item onSelect={() => void signOut()}>
              <ActionList.LeadingVisual>
                <LogOutIcon />
              </ActionList.LeadingVisual>
              Logga ut
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
