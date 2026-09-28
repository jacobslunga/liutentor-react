import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { IS_MAC } from "@/stores/learn-sidebar";

/** The sidebar shortcut (Cmd/Ctrl+.) as shown in tooltips. */
export function SidebarShortcutKbd() {
  return (
    <KbdGroup>
      <Kbd>{IS_MAC ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>.</Kbd>
    </KbdGroup>
  );
}
