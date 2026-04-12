export function buildGoogleImagesUrl(queryOrUrl: string): string | null {
  const q = String(queryOrUrl || "").trim();
  if (!q) return null;

  const lower = q.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return q;

  const url = new URL("https://www.google.com/search");
  url.searchParams.set("tbm", "isch");
  url.searchParams.set("q", q);
  return url.toString();
}

