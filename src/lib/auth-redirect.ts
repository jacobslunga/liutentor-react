// Only allow local app destinations, and never return to authentication itself.
export function validateAuthRedirect(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return;
  try {
    const base = "https://liutentor.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return;
    if (/^\/(logga-in|skapa-konto)\/?$/.test(url.pathname)) return;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return;
  }
}
