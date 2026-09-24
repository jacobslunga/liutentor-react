import { useEffect } from "react";

const SITE_NAME = "LiU Tentor";
const SITE_URL = "https://liutentor.se";
const DEFAULT_DESCRIPTION =
  "Hitta och plugga på gamla tentor från Linköpings universitet";

export interface SeoOptions {
  title: string;
  description?: string;
  path?: string;
  robots?: string;
  jsonLd?: object;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.dataset.liutentorSeo = "true";
    document.head.appendChild(element);
  }
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
}

/** Keeps metadata correct during client-side navigation. Initial responses are
 * enriched by the matching Netlify edge function for crawlers and previews. */
export function useSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = window.location.pathname,
  robots = "index, follow",
  jsonLd,
}: SeoOptions) {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`;
    const canonical = new URL(path, SITE_URL).toString();
    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "sv_SE" });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: `${SITE_URL}/logo.svg` });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      canonicalLink.dataset.liutentorSeo = "true";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    document.head.querySelector('script[data-liutentor-json-ld]')?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.liutentorJsonLd = "true";
      script.text = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    }
  }, [description, jsonLd, path, robots, title]);
}

