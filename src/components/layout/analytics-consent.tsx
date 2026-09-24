import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getAnalyticsConsent,
  initAnalytics,
  setAnalyticsConsent,
  trackPageView,
} from "@/lib/analytics";

export function AnalyticsConsent() {
  const [consent, setConsent] = useState(getAnalyticsConsent);
  if (consent !== null) return null;

  function choose(granted: boolean) {
    setAnalyticsConsent(granted);
    setConsent(granted);
    if (granted) {
      initAnalytics();
      trackPageView(window.location.pathname);
    }
  }

  return (
    <aside
      className="fixed right-4 bottom-4 left-4 z-100 mx-auto rounded-lg max-w-xl border bg-background p-4 shadow-lg sm:left-auto sm:p-5"
      aria-label="Inställningar för analyscookies"
    >
      <p className="font-medium">Hjälp oss förbättra LiU Tentor</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Vi använder Google Analytics först efter ditt godkännande. Nödvändiga
        funktioner fungerar oavsett ditt val.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => choose(false)}>
          Endast nödvändiga
        </Button>
        <Button size="sm" onClick={() => choose(true)}>
          Godkänn analys
        </Button>
      </div>
    </aside>
  );
}
