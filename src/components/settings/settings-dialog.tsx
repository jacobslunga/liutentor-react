import { THEME_PALETTES, isThemePalette } from "@/lib/theme-palettes";
import { DialogPresence } from "@/components/shared/dialog-presence";
import { MAX_ATTACHMENTS } from "@/lib/chat-attachments";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat-limits";
import { Link } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ChatEffort, ChatModelId } from "@/lib/chat-models";
import { useRecentSearches } from "@/stores/recent-searches";
import {
  useSelectedModel,
  useSettingsStore,
  type LayoutMode,
} from "@/stores/settings";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";
import { AppDialog } from "@/components/shared/app-dialog";
import { KeyHint } from "@/components/shared/key-hint";
import { Switch } from "@/components/ui/switch";

const SHORTCUT_GROUPS = [
  {
    label: "Synlighet",
    shortcuts: [
      { action: "Visa eller dölj facit", keys: ["E"] },
      { action: "Visa eller dölj facit på mobil", keys: ["F"] },
      { action: "Visa eller dölj AI-chatten", keys: ["C"] },
      { action: "Stäng chatt och facit", keys: ["Escape"] },
    ],
  },
  {
    label: "Layout",
    shortcuts: [
      {
        action: "Flytta delningslinjen i delad vy",
        keys: ["ArrowLeft", "ArrowRight"],
      },
    ],
  },
  {
    label: "Chatten",
    shortcuts: [
      { action: "Skicka meddelande", keys: ["Enter"] },
      { action: "Ny rad", keys: ["Shift+Enter"] },
    ],
  },
];

const FIXED_LIMITS = [
  {
    label: "Meddelanden i chatten",
    value: `Max ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString("sv-SE")} tecken`,
  },
  {
    label: "Bilagor i en aktiv chatt",
    value: `${MAX_ATTACHMENTS} filer, 5 MB per fil, 20 MB totalt`,
  },
  {
    label: "Markerad text till chatten",
    value: `Max ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString("sv-SE")} tecken`,
  },
  { label: "Senaste sökningar", value: "3 kurskoder" },
  { label: "Chatthistorik", value: "Sparas bara när du är inloggad" },
  { label: "Dina inställningar", value: "Sparas lokalt i webbläsaren" },
];

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? open : internalOpen;
  const setOpen = (value: boolean) =>
    controlled ? onOpenChange?.(value) : setInternalOpen(value);

  return (
    <>
      {!controlled && (
        <IconButton
          variant="ghost"
          aria-label="Inställningar"
          onClick={() => setOpen(true)}
        >
          <SettingsIcon />
        </IconButton>
      )}
      <DialogPresence>
        {isOpen && (
          <AppDialog
            title="Inställningar"
            description="Anpassa hur LiU Tentor beter sig."
            onClose={() => setOpen(false)}
          >
            <SettingsContent />
          </AppDialog>
        )}
      </DialogPresence>
    </>
  );
}

function SettingsContent() {
  const { theme = "system", setTheme } = useTheme();
  const themePalette = useSettingsStore((s) => s.themePalette);
  const setThemePalette = useSettingsStore((s) => s.setThemePalette);
  const layoutMode = useSettingsStore((s) => s.layoutMode);
  const setLayoutMode = useSettingsStore((s) => s.setLayoutMode);
  const blurFacit = useSettingsStore((s) => s.blurFacitUntilHover);
  const setBlurFacit = useSettingsStore((s) => s.setBlurFacitUntilHover);
  const showExplain = useSettingsStore((s) => s.showExplainPopover);
  const setShowExplain = useSettingsStore((s) => s.setShowExplainPopover);
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const setSelectedEffort = useSettingsStore((s) => s.setSelectedEffort);
  const { selectedModelId, selectedEffort, availableModels, availableEfforts } =
    useSelectedModel();
  const recentSearches = useRecentSearches((s) => s.latest);
  const clearRecentSearches = useRecentSearches((s) => s.clear);

  return (
    <div className="flex flex-col gap-6 pt-1 pb-2">
      <Section title="Utseende">
        <Row
          label="Läge"
          description="System följer inställningen i din enhet."
        >
          <select
            aria-label="Läge"
            className="h-8 w-44 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="light">Ljust</option>
            <option value="dark">Mörkt</option>
            <option value="system">System</option>
          </select>
        </Row>
        <Row
          label="Färgtema"
          description="Kodeditorns färger, anpassade för LiU Tentor."
        >
          <select
            aria-label="Färgtema"
            className="h-8 w-44 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            value={themePalette}
            onChange={(event) => {
              if (isThemePalette(event.target.value))
                setThemePalette(event.target.value);
            }}
          >
            {THEME_PALETTES.map((palette) => (
              <option key={palette.id} value={palette.id}>
                {palette.label}
              </option>
            ))}
          </select>
        </Row>
        <div
          aria-hidden="true"
          className="mt-3.5 flex items-center gap-2 rounded-lg border bg-card p-3"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            Aa
          </span>
          <span className="text-sm text-card-foreground">
            {
              THEME_PALETTES.find((palette) => palette.id === themePalette)
                ?.label
            }
          </span>
          <span className="ml-auto size-5 rounded-full border bg-background" />
          <span className="size-5 rounded-full border bg-secondary" />
          <span className="size-5 rounded-full border bg-accent" />
          <span className="size-5 rounded-full border bg-primary" />
        </div>
      </Section>

      <Section title="Läsvy">
        <Row
          label="Standardvy"
          description="Hur en tenta öppnas. Du kan alltid byta i tentavyn."
        >
          <select
            aria-label="Standardvy"
            className="h-8 w-44 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            value={layoutMode}
            onChange={(event) =>
              setLayoutMode(event.target.value as LayoutMode)
            }
          >
            <option value="exam-with-facit">Tenta och facit</option>
            <option value="exam-only">Endast tenta</option>
          </select>
        </Row>
        <Row
          id="setting-blur-facit"
          label="Dölj facit tills du pekar på det"
          description="Gäller delad vy. Med detta av ligger facit framme direkt."
        >
          <Switch
            checked={blurFacit}
            onCheckedChange={setBlurFacit}
            aria-labelledby="setting-blur-facit"
          />
        </Row>
        <Row
          id="setting-show-explain"
          label='Visa "Förklara" vid markering'
          description="Knappen som dyker upp när du markerar text i en tenta."
        >
          <Switch
            checked={showExplain}
            onCheckedChange={setShowExplain}
            aria-labelledby="setting-show-explain"
          />
        </Row>
      </Section>

      <Section title="AI-assistenten">
        <Row label="Modell" description="Vilken AI som svarar i chatten.">
          <select
            aria-label="Modell"
            className="h-8 w-44 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            value={selectedModelId}
            onChange={(event) =>
              setSelectedModelId(event.target.value as ChatModelId)
            }
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label="Tankenivå"
          description="Hur mycket chatten tänker innan den svarar."
        >
          <select
            aria-label="Tankenivå"
            className="h-8 w-44 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            value={selectedEffort}
            onChange={(event) =>
              setSelectedEffort(event.target.value as ChatEffort)
            }
          >
            {availableEfforts.map((effort) => (
              <option key={effort.id} value={effort.id}>
                {effort.label}
              </option>
            ))}
          </select>
        </Row>
        <p className="pt-3.5 text-xs leading-relaxed text-muted-foreground">
          AI kan göra misstag – se svaren som pedagogiska förslag, inte som
          facit. Läs mer i vår{" "}
          <Link
            to="/ai-policy"
            className="text-foreground underline underline-offset-4"
          >
            AI-policy
          </Link>
          .
        </p>
      </Section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          Tangentbordsgenvägar
        </h3>
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <h4 className="text-xs text-muted-foreground/70">{group.label}</h4>
            <div className="divide-y overflow-hidden rounded-md border">
              {group.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between gap-4 px-3 py-2"
                >
                  <span className="min-w-0 text-sm">{shortcut.action}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <KeyHint key={key} keys={key} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          Fasta gränser
        </h3>
        <dl className="divide-y overflow-hidden rounded-md border">
          {FIXED_LIMITS.map((item) => (
            <div
              key={item.label}
              className="flex items-baseline justify-between gap-4 px-3 py-2"
            >
              <dt className="text-sm">{item.label}</dt>
              <dd className="shrink-0 text-right text-xs text-muted-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <Row
          label="Senaste sökningar"
          description={
            recentSearches.length
              ? `Sparat på den här enheten: ${recentSearches.map((s) => s.courseCode).join(", ")}.`
              : "Inga sparade sökningar på den här enheten."
          }
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!recentSearches.length}
            onClick={() => {
              clearRecentSearches();
              toast.success("Senaste sökningar rensade");
            }}
          >
            Rensa
          </Button>
        </Row>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({
  id,
  label,
  description,
  children,
}: {
  id?: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b py-3.5 last:border-b-0">
      <div className="min-w-0 space-y-0.5">
        <p id={id} className="text-sm font-medium">
          {label}
        </p>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}
