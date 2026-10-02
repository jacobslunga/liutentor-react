import { Kbd, KbdGroup } from "@/components/ui/kbd";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

// Key names (as in KeyboardEvent.key, plus "Mod") drawn as symbols.
const SYMBOLS: Record<string, string> = {
  mod: isMac ? "⌘" : "Ctrl",
  ctrl: isMac ? "⌃" : "Ctrl",
  shift: "⇧",
  alt: isMac ? "⌥" : "Alt",
  enter: "↵",
  escape: "Esc",
  tab: "⇥",
  backspace: "⌫",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
};

/** A shortcut such as "Mod+." or "Shift+Enter" as shadcn Kbd keys. */
export function KeyHint({ keys, className }: { keys: string; className?: string }) {
  const parts = keys.split(/\+(?!$)/);
  return (
    <KbdGroup className={className}>
      {parts.map((part) => (
        <Kbd key={part}>{SYMBOLS[part.toLowerCase()] ?? part}</Kbd>
      ))}
    </KbdGroup>
  );
}
