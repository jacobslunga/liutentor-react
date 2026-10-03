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
      <TooltipProvider delayDuration={500}>{children}</TooltipProvider>
    </NextThemesProvider>
  );
}
