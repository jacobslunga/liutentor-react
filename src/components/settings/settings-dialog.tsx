import { Dialog, Select, ToggleSwitch } from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
import { Link } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ChatModelId } from "@/lib/chat-models";
import { useRecentSearches } from "@/stores/recent-searches";
import {
  useSelectedModel,
  useSettingsStore,
  type LayoutMode,
} from "@/stores/settings";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";

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
      { action: "Flytta delningslinjen i delad vy", keys: ["ArrowLeft", "ArrowRight"] },
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
  { label: "Meddelanden i chatten", value: "Max 4 000 tecken" },
  {
    label: "Bilagor i en aktiv chatt",
    value: "5 filer, 5 MB per fil, 20 MB totalt",
  },
  { label: "Markerad text till chatten", value: "Max 4 000 tecken" },
  { label: "Senaste sökningar", value: "3 kurskoder" },
  { label: "Chatthistorik", value: "Sparas bara när du är inloggad" },
  { label: "Dina inställningar", value: "Sparas lokalt i webbläsaren" },
];

interface SettingsDialogProps {
  /** Controlled mode, e.g. opened from a menu. Omit to render a trigger button. */
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
        <IconButton variant="ghost" aria-label="Inställningar" onClick={() => setOpen(true)}><SettingsIcon /></IconButton>
      )}
      {isOpen && (
        <Dialog
          width="large"
          title="Inställningar"
          subtitle="Anpassa hur LiU Tentor beter sig."
          onClose={() => setOpen(false)}
        >
          <SettingsContent />
        </Dialog>
      )}
    </>
  );
}

function SettingsContent() {
  const { theme = "system", setTheme } = useTheme();
  const layoutMode = useSettingsStore((s) => s.layoutMode);
  const setLayoutMode = useSettingsStore((s) => s.setLayoutMode);
  const blurFacit = useSettingsStore((s) => s.blurFacitUntilHover);
  const setBlurFacit = useSettingsStore((s) => s.setBlurFacitUntilHover);
  const showExplain = useSettingsStore((s) => s.showExplainPopover);
  const setShowExplain = useSettingsStore((s) => s.setShowExplainPopover);
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const { selectedModelId, availableModels } = useSelectedModel();
  const recentSearches = useRecentSearches((s) => s.latest);
  const clearRecentSearches = useRecentSearches((s) => s.clear);

  return (
    <div className="flex flex-col gap-6 pt-1 pb-2">
      <Section title="Utseende">
        <Row
          label="Tema"
          description="System följer inställningen i din enhet."
        >
          <Select
            size="small"
            aria-label="Tema"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <Select.Option value="light">Ljust</Select.Option>
            <Select.Option value="dark">Mörkt</Select.Option>
            <Select.Option value="system">System</Select.Option>
          </Select>
        </Row>
      </Section>

      <Section title="Läsvy">
        <Row
          label="Standardvy"
          description="Hur en tenta öppnas. Du kan alltid byta i tentavyn."
        >
          <Select
            size="small"
            aria-label="Standardvy"
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
          >
            <Select.Option value="exam-with-facit">Tenta och facit</Select.Option>
            <Select.Option value="exam-only">Endast tenta</Select.Option>
          </Select>
        </Row>
        <Row
          id="setting-blur-facit"
          label="Dölj facit tills du pekar på det"
          description="Gäller delad vy. Med detta av ligger facit framme direkt."
        >
          <ToggleSwitch
            size="small"
            buttonLabelOn="På"
            buttonLabelOff="Av"
            checked={blurFacit}
            onChange={setBlurFacit}
            aria-labelledby="setting-blur-facit"
          />
        </Row>
        <Row
          id="setting-show-explain"
          label='Visa "Förklara" vid markering'
          description="Knappen som dyker upp när du markerar text i en tenta."
        >
          <ToggleSwitch
            size="small"
            buttonLabelOn="På"
            buttonLabelOff="Av"
            checked={showExplain}
            onChange={setShowExplain}
            aria-labelledby="setting-show-explain"
          />
        </Row>
      </Section>

      <Section title="AI-assistenten">
        <Row
          label="Tankenivå"
          description="Hur mycket chatten tänker innan den svarar."
        >
          <Select
            size="small"
            aria-label="Tankenivå"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value as ChatModelId)}
          >
            {availableModels.map((model) => (
              <Select.Option key={model.id} value={model.id}>
                {model.label}
              </Select.Option>
            ))}
          </Select>
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
                      <KeybindingHint key={key} keys={key} size="small" />
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
          <Button variant="outline" size="sm" disabled={!recentSearches.length} onClick={() => {
              clearRecentSearches();
              toast.success("Senaste sökningar rensade");
            }}>
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
