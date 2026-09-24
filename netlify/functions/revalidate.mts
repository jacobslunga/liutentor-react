function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Keeps the existing exam-change webhook useful after the Nuxt → React cutover. */
export default async (request: Request) => {
  if (request.method !== "POST") return json({ message: "Method not allowed" }, 405);

  const secret = process.env.REVALIDATE_SECRET ?? process.env.NUXT_REVALIDATE_SECRET;
  if (!secret) return json({ message: "Revalidation secret is not configured" }, 500);
  if (request.headers.get("x-revalidate-secret") !== secret) {
    return json({ message: "Unauthorized" }, 401);
  }

  const token = process.env.NETLIFY_PURGE_API_TOKEN;
  const siteId = process.env.SITE_ID;
  if (!token || !siteId) {
    return json({ message: "Netlify purge credentials are not configured" }, 500);
  }

  const response = await fetch("https://api.netlify.com/api/v1/purge", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ site_id: siteId, cache_tags: ["sitemap"] }),
  });

  if (!response.ok) return json({ message: "Netlify cache purge failed" }, 502);
  return json({ purged: ["sitemap"] });
};

export const config = { path: "/api/revalidate" };

