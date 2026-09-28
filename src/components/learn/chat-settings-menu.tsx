import { MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import type { ChatModelId } from "@/lib/chat-models";
import { useSelectedModel, useSettingsStore } from "@/stores/settings";

const THEMES = [
  { value: "light", label: "Ljust", Icon: SunIcon },
  { value: "dark", label: "Mörkt", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
] as const;

const TIPS: { text: string; keys?: string[] }[] = [
  { text: "Välj en kurs att prata om, t.ex. @TATA41", keys: ["@"] },
  { text: "Skicka meddelande", keys: ["Enter"] },
  { text: "Ny rad", keys: ["Shift", "Enter"] },
  { text: "Dra in eller klistra in bilder och PDF:er" },
  { text: "Markera text i ett svar för att fråga om den" },
];

/**
 * The chat's quick settings: theme and thinking level, plus how the chat
 * works. Everything else stays in the full settings dialog.
 */
export function ChatSettingsMenu() {
  const { theme = "system", setTheme } = useTheme();
  const { selectedModelId, availableModels } = useSelectedModel();
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Inställningar"
          >
            <SettingsIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          sideOffset={8}
          className="flex max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height))] w-64 flex-col overflow-hidden p-0"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Tema
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              {THEMES.map(({ value, label, Icon }) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  // Keep the menu open so the change is visible in place.
                  onSelect={(e) => e.preventDefault()}
                >
                  <Icon />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Tankenivå
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedModelId}
              onValueChange={(v) => setSelectedModelId(v as ChatModelId)}
            >
              {availableModels.map((model) => (
                <DropdownMenuRadioItem
                  key={model.id}
                  value={model.id}
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="flex flex-col">
                    <span>{model.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {model.hint}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Tips
            </DropdownMenuLabel>
            <ul className="space-y-1.5 px-2 pb-1.5">
              {TIPS.map(({ keys, text }) => (
                <li
                  key={text}
                  className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                >
                  <span>{text}</span>
                  {keys && (
                    <span className="flex shrink-0 gap-1">
                      {keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>

          </div>
          <div className="shrink-0 border-t p-1">
            <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
              <SettingsIcon />
              Alla inställningar
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
