import { MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import type { ChatModelId } from "@/lib/chat-models";
import { useSelectedModel, useSettingsStore } from "@/stores/settings";
import { IconButton } from "@/components/shared/icon-button";
import { KeyHint } from "@/components/shared/key-hint";
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

const THEMES = [
  { value: "light", label: "Ljust", Icon: SunIcon },
  { value: "dark", label: "Mörkt", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
] as const;

const TIPS: { text: string; keys?: string[] }[] = [
  { text: "Välj en kurs att prata om, t.ex. @TATA41", keys: ["@"] },
  { text: "Skicka meddelande", keys: ["Enter"] },
  { text: "Ny rad", keys: ["Shift+Enter"] },
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
          <IconButton className="shrink-0" aria-label="Inställningar">
            <SettingsIcon />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-64">
          <div className="max-h-88 overflow-y-auto overscroll-contain">
            {/* Choices keep the menu open (preventDefault) so the change is
                visible in place. */}
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              {THEMES.map(({ value, label, Icon }) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  onSelect={(e) => e.preventDefault()}
                >
                  <Icon />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Tankenivå</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedModelId}
              onValueChange={(value) =>
                setSelectedModelId(value as ChatModelId)
              }
            >
              {availableModels.map((model) => (
                <DropdownMenuRadioItem
                  key={model.id}
                  value={model.id}
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col">
                    <span>{model.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {model.hint}
                    </span>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <div className="border-t px-4 pt-2 pb-3">
              <p className="pb-2 text-xs font-semibold text-muted-foreground">
                Tips
              </p>
              <ul className="space-y-1.5">
                {TIPS.map(({ keys, text }) => (
                  <li
                    key={text}
                    className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                  >
                    <span>{text}</span>
                    {keys && (
                      <span className="flex shrink-0 gap-1">
                        {keys.map((key) => (
                          <KeyHint key={key} keys={key} />
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            <SettingsIcon />
            Alla inställningar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
