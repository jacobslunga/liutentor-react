import { useSettingsStore } from "@/stores/settings";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

function FaviconSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const link = document.getElementById("favicon") as HTMLLinkElement | null;
    if (!link) return;
    link.href =
      resolvedTheme === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg";
  }, [resolvedTheme]);

  return null;
}

function PaletteSync() {
  const palette = useSettingsStore((s) => s.themePalette);
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="color-mode"
      disableTransitionOnChange

      scriptProps={{ type: "application/json" }}
    >
      <FaviconSync />
      <PaletteSync />
      <TooltipProvider delayDuration={500}>{children}</TooltipProvider>
    </NextThemesProvider>
  );
}
