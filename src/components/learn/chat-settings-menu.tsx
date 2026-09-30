import { ActionList, ActionMenu, IconButton } from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
import { MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
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
      <ActionMenu>
        <ActionMenu.Anchor>
          <IconButton
            icon={SettingsIcon}
            variant="invisible"
            className="shrink-0"
            aria-label="Inställningar"
          />
        </ActionMenu.Anchor>
        <ActionMenu.Overlay side="outside-right" align="end" width="medium">
          <div className="max-h-88 overflow-y-auto overscroll-contain">
            <ActionList>
              <ActionList.Group selectionVariant="single">
                <ActionList.GroupHeading>Tema</ActionList.GroupHeading>
                {THEMES.map(({ value, label, Icon }) => (
                  <ActionList.Item
                    key={value}
                    selected={theme === value}
                    onSelect={(e) => {
                      // Keep the menu open so the change is visible in place.
                      e.preventDefault();
                      setTheme(value);
                    }}
                  >
                    <ActionList.LeadingVisual>
                      <Icon />
                    </ActionList.LeadingVisual>
                    {label}
                  </ActionList.Item>
                ))}
              </ActionList.Group>
              <ActionList.Divider />
              <ActionList.Group selectionVariant="single">
                <ActionList.GroupHeading>Tankenivå</ActionList.GroupHeading>
                {availableModels.map((model) => (
                  <ActionList.Item
                    key={model.id}
                    selected={selectedModelId === model.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelectedModelId(model.id as ChatModelId);
                    }}
                  >
                    {model.label}
                    <ActionList.Description variant="block">
                      {model.hint}
                    </ActionList.Description>
                  </ActionList.Item>
                ))}
              </ActionList.Group>
            </ActionList>
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
                          <KeybindingHint key={key} keys={key} size="small" />
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ActionList className="border-t">
            <ActionList.Item onSelect={() => setDialogOpen(true)}>
              <ActionList.LeadingVisual>
                <SettingsIcon />
              </ActionList.LeadingVisual>
              Alla inställningar
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
      <SettingsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
