import type { Source } from "./prompt.ts";

export function buildQuery(claim: string): string {
  const q = claim.replace(/\s+/g, " ").trim().slice(0, 200); // Firecrawl caps query at 500
  return `${q} (cek fakta OR hoaks OR kominfo)`;
}

type Hit = { title?: string; url?: string; description?: string; markdown?: string; metadata?: { title?: string } };

export async function searchSources(claim: string, limit = 5): Promise<Source[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY belum diatur");

  const res = await fetch(`${process.env.FIRECRAWL_BASE ?? "https://api.firecrawl.dev"}/v2/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query: buildQuery(claim),
      limit,
      country: "ID",
      ignoreInvalidURLs: true,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
    signal: AbortSignal.timeout(Number(process.env.FIRECRAWL_TIMEOUT_MS ?? 45_000)),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`);

  const json = await res.json();
  const hits: Hit[] = json?.data?.web ?? (Array.isArray(json?.data) ? json.data : []);
  return hits
    .filter((h): h is Hit & { url: string } => typeof h?.url === "string" && /^https?:\/\//.test(h.url))
    .map((h) => ({
      title: h.title ?? h.metadata?.title ?? h.url,
      url: h.url,
      markdown: h.markdown ?? h.description ?? "",
    }));
}
