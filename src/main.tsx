import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";
import { initAuth } from "@/stores/auth";
import "./index.css";

void initAuth();

initAnalytics();
// A frame later the route has set document.title, so the view carries its name.
router.subscribe("onResolved", ({ toLocation }) =>
  requestAnimationFrame(() => trackPageView(toLocation.pathname)),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
