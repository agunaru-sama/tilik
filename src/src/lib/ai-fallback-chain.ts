import { SYSTEM_PROMPT, buildUserPrompt, type Source } from "./prompt.ts";

export type Verdict = {
  accuracyPercentage: number;
  status: string;
  explanation: string;
  references: { title: string; url: string }[];
};

type Tier = { provider: "gemini" | "groq"; model: string };

// Cheapest -> strongest. Model IDs rot (Groq retired its llama-3.x on 2026-08-16), so override without code:
// AI_TIERS="gemini:gemini-3.5-flash-lite,gemini:gemini-3.6-flash,groq:openai/gpt-oss-20b,groq:openai/gpt-oss-120b"
const DEFAULT_TIERS = "gemini:gemini-3.5-flash-lite,gemini:gemini-3.6-flash,groq:openai/gpt-oss-20b,groq:openai/gpt-oss-120b";

export function parseTiers(spec: string): Tier[] {
  return spec.split(",").map((t) => {
    const [provider, ...rest] = t.trim().split(":");
    if ((provider !== "gemini" && provider !== "groq") || !rest.length) throw new Error(`AI_TIERS tidak valid: "${t}"`);
    return { provider, model: rest.join(":") };
  });
}

const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 20_000);

async function httpError(provider: string, model: string, res: Response) {
  const body = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
  return new Error(`${provider} ${model} HTTP ${res.status} ${body}`.trim());
}

async function callGemini(model: string, system: string, user: string): Promise<string> {
  const res = await fetch(`${process.env.GEMINI_BASE ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw await httpError("gemini", model, res);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGroq(model: string, system: string, user: string): Promise<string> {
  const res = await fetch(`${process.env.GROQ_BASE ?? "https://api.groq.com"}/openai/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw await httpError("groq", model, res);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Trust boundary: model output is untrusted. Throw => next tier.
function parseVerdict(raw: string, sources: Source[]): Verdict {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1); // survives stray fences/prose
  const v = JSON.parse(json);
  if (typeof v.accuracyPercentage !== "number" || typeof v.status !== "string" || typeof v.explanation !== "string") {
    throw new Error("schema mismatch");
  }
  const allowed = new Set(sources.map((s) => s.url));
  return {
    accuracyPercentage: Math.min(100, Math.max(0, Math.round(v.accuracyPercentage))),
    status: v.status,
    explanation: v.explanation,
    // drop hallucinated URLs
    references: (Array.isArray(v.references) ? v.references : []).filter(
      (r: { title?: unknown; url?: unknown }) => typeof r?.title === "string" && typeof r?.url === "string" && allowed.has(r.url),
    ),
  };
}

export async function verifyClaim(claim: string, sources: Source[]): Promise<Verdict & { model: string }> {
  const user = buildUserPrompt(claim, sources);
  const errors: string[] = [];

  for (const { provider, model } of parseTiers(process.env.AI_TIERS || DEFAULT_TIERS)) {
    try {
      const raw = provider === "gemini" ? await callGemini(model, SYSTEM_PROMPT, user) : await callGroq(model, SYSTEM_PROMPT, user);
      return { ...parseVerdict(raw, sources), model };
    } catch (e) {
      errors.push(`${model}: ${(e as Error).message}`); // 429, 5xx, timeout, bad JSON: all fall through
    }
  }
  throw new Error(`All AI tiers failed. ${errors.join(" | ")}`);
}
