import { ThemeProvider as PrimerThemeProvider } from "@primer/react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";

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

// Primer's tokens are keyed on data-color-mode. They live on <html> (not only
// Primer's own wrapper) so Radix portals rendered into <body> get them too.
function PrimerThemeBridge({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  return (
    <PrimerThemeProvider
      colorMode={colorMode}
      dayScheme="light"
      nightScheme="dark"
    >
      {children}
    </PrimerThemeProvider>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="color-mode"
      disableTransitionOnChange
      // The pre-paint theme script lives in index.html; next-themes' own inline
      // script never runs in a client-rendered app and only makes React warn.
      scriptProps={{ type: "application/json" }}
    >
      <FaviconSync />
      <PrimerThemeBridge>{children}</PrimerThemeBridge>
    </NextThemesProvider>
  );
}
