const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const CONSENT_KEY = "liutentor-analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getAnalyticsConsent(): boolean | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" ? true : value === "denied" ? false : null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(granted: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
  } catch {
    // Privacy modes may block storage; the choice still applies for this tab.
  }
}

/**
 * Loads Google Analytics (GA4) when VITE_GA_ID is set. Page views are sent by
 * hand from the router, so the initial config doesn't send one of its own.
 */
export function initAnalytics() {
  if (getAnalyticsConsent() !== true) return;

  if (GA_ID && !window.gtag) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // GA reads every entry as an arguments object; a plain array breaks it.
      // oxlint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
  }
}

export function trackPageView(path: string) {
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
