import { searchSources } from "../../../lib/firecrawl.ts";
import { verifyClaim } from "../../../lib/ai-fallback-chain.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  let body: { claim?: unknown; date?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Request-nya tidak terbaca.", 400);
  }

  const claim = typeof body.claim === "string" ? body.claim.trim() : "";
  if (claim.length < 10 || claim.length > 1000) return fail("Klaim minimal 10 dan maksimal 1000 karakter.", 400);
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";

  if (!process.env.FIRECRAWL_API_KEY || !(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY)) {
    return fail("Server belum siap. Isi FIRECRAWL_API_KEY dan GEMINI_API_KEY atau GROQ_API_KEY.", 500);
  }

  let sources;
  try {
    sources = await searchSources(claim);
  } catch (e) {
    return fail(`Gagal cari sumber: ${(e as Error).message}`, 502);
  }

  try {
    const verdict = await verifyClaim(date ? `${claim}\n(tanggal pada klaim: ${date})` : claim, sources);
    return Response.json({ ...verdict, sourceCount: sources.length });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
