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
      {children}
    </NextThemesProvider>
  );
}
