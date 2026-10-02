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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full transition-opacity hover:opacity-80"
            aria-label="Kontomeny"
          >
            <UserAvatar className="size-10" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void navigate({ to: "/me" })}>
            <UserIcon />
            Profil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <SettingsIcon />
            Inställningar
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PaletteIcon />
              Utseende
              <span className="ml-auto text-xs text-muted-foreground">
                {themeLabel}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-40">
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                {THEMES.map(({ value, label, Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    <Icon />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void navigate({ to: "/faq" })}>
            <CircleHelpIcon />
            Vanliga frågor
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void navigate({ to: "/feedback" })}>
            <MessageSquareIcon />
            Skicka feedback
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void navigate({ to: "/om-oss" })}>
            <InfoIcon />
            Om LiU Tentor
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOutIcon />
            Logga ut
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
