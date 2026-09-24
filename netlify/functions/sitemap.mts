const SITE_URL = "https://liutentor.se";
const GO_API_URL =
  process.env.GO_API_URL ??
  "https://liutentor-go-687405545415.europe-west1.run.app";

type Course = { code?: string };

function url(path: string) {
  return `  <url><loc>${SITE_URL}${path}</loc></url>`;
}

export default async () => {
  const staticPaths = [
    "/",
    "/om-oss",
    "/faq",
    "/ai-policy",
    "/copyright-policy",
    "/privacy-policy",
    "/upload-exams",
    "/feedback",
  ];

  let courses: Course[] = [];
  try {
    const response = await fetch(`${GO_API_URL}/v1/courses/LIU`);
    if (response.ok) {
      const body = (await response.json()) as {
        data?: { courses?: Course[] };
      };
      courses = body.data?.courses ?? [];
    }
  } catch (error) {
    console.error("Failed to load courses for sitemap", error);
  }

  const coursePaths = courses
    .map((course) => course.code?.trim().toUpperCase())
    .filter((code): code is string => !!code)
    .sort()
    .map((code) => `/search/${encodeURIComponent(code)}`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPaths, ...coursePaths].map(url).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control":
        "public, durable, s-maxage=86400, stale-while-revalidate=300",
      "Netlify-Cache-Tag": "sitemap",
    },
  });
};

export const config = { path: "/sitemap.xml" };
