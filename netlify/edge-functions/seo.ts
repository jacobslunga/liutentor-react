const SITE_URL = "https://liutentor.se";
const GO_API_URL =
  "https://liutentor-go-687405545415.europe-west1.run.app";
const DEFAULT_DESCRIPTION =
  "Hitta och plugga på gamla tentor från Linköpings universitet";

type Seo = {
  title: string;
  description: string;
  robots?: string;
  canonicalPath: string;
  jsonLd?: object;
};

const staticPages: Record<string, Omit<Seo, "canonicalPath">> = {
  "/": { title: "Sök tentor", description: DEFAULT_DESCRIPTION },
  "/om-oss": {
    title: "Om oss",
    description: "Läs om LiU Tentor och hur vi hjälper studenter att hitta och plugga på gamla tentor.",
  },
  "/faq": {
    title: "Vanliga frågor (FAQ)",
    description: "Svar på vanliga frågor om tentor, facit, uppladdningar, konton och AI-funktioner på LiU Tentor.",
  },
  "/feedback": { title: "Feedback", description: "Skicka feedback till LiU Tentor-teamet." },
  "/upload-exams": {
    title: "Ladda upp tenta",
    description: "Ladda upp gamla tentor och facit till LiU Tentor.",
  },
  "/ai-policy": {
    title: "AI-policy",
    description: "Så använder LiU Tentor AI på ett ansvarsfullt och transparent sätt.",
  },
  "/copyright-policy": {
    title: "Upphovsrätt",
    description: "Information om upphovsrätt och hantering av tentamaterial på LiU Tentor.",
  },
  "/privacy-policy": {
    title: "Integritetspolicy",
    description: "Så behandlar och skyddar LiU Tentor dina personuppgifter.",
  },
  "/logga-in": {
    title: "Logga in",
    description: "Logga in till LiU Tentor.",
    robots: "noindex, nofollow",
  },
  "/me": {
    title: "Min profil",
    description: "Hantera din profil på LiU Tentor.",
    robots: "noindex, nofollow",
  },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

async function courseSeo(courseCode: string): Promise<Seo> {
  const code = courseCode.toUpperCase();
  try {
    const response = await fetch(`${GO_API_URL}/v1/exams/LIU/${encodeURIComponent(code)}`);
    if (!response.ok) throw new Error(String(response.status));
    const body = (await response.json()) as {
      data?: {
        courseName?: string;
        exams?: Array<{ id: number; exam_name: string; exam_date: string; has_solution: boolean }>;
      };
    };
    const course = body.data;
    const exams = course?.exams ?? [];
    const name = course?.courseName || code;
    const solutions = exams.filter((exam) => exam.has_solution).length;
    const years = exams.map((exam) => exam.exam_date?.slice(0, 4)).filter(Boolean).sort();
    const yearText = years.length
      ? ` Tentor från ${years[0]}${years.at(-1) !== years[0] ? `–${years.at(-1)}` : ""}.`
      : "";
    const title = `${code} tentor & facit – ${name}`;
    const description = `${exams.length} gamla tentor${solutions ? ` varav ${solutions} med facit` : ""} för ${code} – ${name} vid Linköpings universitet.${yearText}`;
    const canonicalPath = `/search/${encodeURIComponent(code)}`;
    const canonical = `${SITE_URL}${canonicalPath}`;
    return {
      title,
      description,
      canonicalPath,
      robots: exams.length ? "index, follow" : "noindex, follow",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Hem", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: code, item: canonical },
            ],
          },
          {
            "@type": "Course",
            name: `${code} – ${name}`,
            courseCode: code,
            description,
            url: canonical,
            inLanguage: "sv",
            provider: { "@type": "CollegeOrUniversity", name: "Linköpings universitet", url: "https://liu.se" },
          },
          {
            "@type": "ItemList",
            name: `Gamla tentor för ${code}`,
            numberOfItems: exams.length,
            itemListElement: exams.map((exam, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: `${code} ${exam.exam_name}`,
              url: `${canonical}/${exam.id}`,
            })),
          },
        ],
      },
    };
  } catch {
    return {
      title: `${code} – gamla tentor`,
      description: `Hitta gamla tentor och facit för ${code} vid Linköpings universitet.`,
      canonicalPath: `/search/${encodeURIComponent(code)}`,
      robots: "noindex, follow",
    };
  }
}

function injectSeo(html: string, seo: Seo) {
  const fullTitle = `${seo.title} | LiU Tentor`;
  const canonical = `${SITE_URL}${seo.canonicalPath}`;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  for (const key of ["description", "robots", "twitter:card", "twitter:title", "twitter:description"]) {
    html = html.replace(new RegExp(`<meta[^>]+name=["']${key}["'][^>]*>`, "gi"), "");
  }
  for (const key of ["og:site_name", "og:type", "og:title", "og:description", "og:url", "og:image", "og:locale"]) {
    html = html.replace(new RegExp(`<meta[^>]+property=["']${key}["'][^>]*>`, "gi"), "");
  }
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "");
  const tags = [
    `<meta name="description" content="${escapeHtml(seo.description)}">`,
    `<meta name="robots" content="${escapeHtml(seo.robots ?? "index, follow")}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:site_name" content="LiU Tentor">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}">`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${SITE_URL}/logo.svg">`,
    `<meta property="og:locale" content="sv_SE">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}">`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}">`,
    seo.jsonLd ? `<script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n    ");
  return html.replace("</head>", `    ${tags}\n  </head>`);
}

export default async (request: Request, context: { next(): Promise<Response> }) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  let seo: Seo | undefined;
  if (parts[0] === "search" && parts.length === 2) {
    seo = await courseSeo(decodeURIComponent(parts[1]!));
  } else if (parts[0] === "search" && parts.length >= 3) {
    const code = decodeURIComponent(parts[1]!).toUpperCase();
    seo = {
      title: `${code} – tenta`,
      description: `Tentamensvisning för ${code} på LiU Tentor.`,
      canonicalPath: url.pathname,
      robots: "noindex, nofollow",
    };
  } else if (staticPages[url.pathname]) {
    seo = { ...staticPages[url.pathname]!, canonicalPath: url.pathname };
  }
  const response = await context.next();
  if (!seo || !response.headers.get("content-type")?.includes("text/html")) return response;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injectSeo(await response.text(), seo), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const config = {
  path: [
    "/", "/search/*", "/om-oss", "/faq", "/feedback", "/upload-exams",
    "/ai-policy", "/copyright-policy", "/privacy-policy", "/logga-in", "/me",
  ],
};

