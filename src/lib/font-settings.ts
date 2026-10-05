import { useSettingsStore } from "@/stores/settings";

export function initFontSettings() {
  const applyFonts = (
    settings: ReturnType<typeof useSettingsStore.getState>,
  ) => {
    document.documentElement.dataset.chatFont = settings.chatFont;
    document.documentElement.dataset.uiFont = settings.uiFont;
  };

  applyFonts(useSettingsStore.getState());
  return useSettingsStore.subscribe(applyFonts);
}
