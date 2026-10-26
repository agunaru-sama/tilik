import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { POST } from "../src/app/api/verify/route.ts";
import { buildQuery } from "../src/lib/firecrawl.ts";
import { layout, findDate, type Line } from "../src/lib/ocr.ts";

const GOOD_URL = "https://turnbackhoax.id/artikel-1";
const calls: string[] = [];
// per-model behaviour: "429" | "garbage" | "ok" | "ok-fenced"
let behaviour: Record<string, string> = {};
let server: http.Server;

const verdict = {
  accuracyPercentage: 12.4,
  status: "Indikasi Hoaks / Manipulasi",
  explanation: "Klaim ini dibantah.",
  references: [
    { title: "Bantahan", url: GOOD_URL },
    { title: "Halusinasi", url: "https://evil.example/fake" },
  ],
};

function reply(res: http.ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const url = req.url ?? "";
      if (url === "/v2/search") {
        calls.push("firecrawl");
        assert.equal(req.headers.authorization, "Bearer fc-key");
        const body = JSON.parse(raw);
        assert.match(body.query, /cek fakta/);
        return reply(res, 200, {
          success: true,
          data: { web: [{ title: "TurnBackHoax", url: GOOD_URL, markdown: "# Hoaks\nKlaim bantahan." }, { title: "no url" }] },
        });
      }
      const gem = url.match(/models\/([^:]+):generateContent/);
      const model = gem ? gem[1] : JSON.parse(raw).model;
      calls.push(model);
      const mode = behaviour[model] ?? "429";
      if (mode === "429") return reply(res, 429, { error: "rate" });
      const text = mode === "garbage" ? "maaf saya tidak bisa" : mode === "ok-fenced" ? "```json\n" + JSON.stringify(verdict) + "\n```" : JSON.stringify(verdict);
      if (gem) return reply(res, 200, { candidates: [{ content: { parts: [{ text }] } }] });
      return reply(res, 200, { choices: [{ message: { content: text } }] });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  Object.assign(process.env, {
    FIRECRAWL_BASE: base,
    GEMINI_BASE: base,
    GROQ_BASE: base,
    FIRECRAWL_API_KEY: "fc-key",
    GEMINI_API_KEY: "g-key",
    GROQ_API_KEY: "q-key",
    AI_TIMEOUT_MS: "3000",
  });
});

after(() => server.close());

const post = (body: unknown) =>
  POST(new Request("http://x/api/verify", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

test("buildQuery trims and appends keywords", () => {
  assert.equal(buildQuery("  halo   dunia  "), "halo dunia (cek fakta OR hoaks OR kominfo)");
});

test("falls Gemini 429 x2 -> Groq garbage -> Groq 70b ok, drops hallucinated URL, clamps/rounds", async () => {
  calls.length = 0;
  behaviour = { "openai/gpt-oss-20b": "garbage", "openai/gpt-oss-120b": "ok" };
  const res = await post({ claim: "Vaksin menyebabkan magnet di tubuh", date: "2026-10-01" });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.deepEqual(calls, ["firecrawl", "gemini-3.5-flash-lite", "gemini-3.6-flash", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
  assert.equal(j.model, "openai/gpt-oss-120b");
  assert.equal(j.accuracyPercentage, 12);
  assert.deepEqual(j.references, [{ title: "Bantahan", url: GOOD_URL }]);
  assert.equal(j.sourceCount, 1);
});

test("stops at tier 1 when it succeeds, parses fenced JSON", async () => {
  calls.length = 0;
  behaviour = { "gemini-3.5-flash-lite": "ok-fenced" };
  const j = await (await post({ claim: "Klaim yang cukup panjang untuk diuji" })).json();
  assert.equal(j.model, "gemini-3.5-flash-lite");
  assert.deepEqual(calls, ["firecrawl", "gemini-3.5-flash-lite"]);
});

test("all tiers fail -> 502 listing every model", async () => {
  behaviour = {};
  const res = await post({ claim: "Klaim yang cukup panjang untuk diuji" });
  assert.equal(res.status, 502);
  const { error } = await res.json();
  for (const m of ["gemini-3.5-flash-lite", "gemini-3.6-flash", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]) assert.match(error, new RegExp(m));
});

test("input validation", async () => {
  assert.equal((await post("not json")).status, 400);
  assert.equal((await post({ claim: "pendek" })).status, 400);
  assert.equal((await post({ claim: "x".repeat(1001) })).status, 400);
  assert.equal((await post({})).status, 400);
});

test("missing server keys -> 500", async () => {
  const saved = process.env.FIRECRAWL_API_KEY;
  delete process.env.FIRECRAWL_API_KEY;
  assert.equal((await post({ claim: "Klaim yang cukup panjang untuk diuji" })).status, 500);
  process.env.FIRECRAWL_API_KEY = saved;
});

test("firecrawl failure -> 502", async () => {
  const saved = process.env.FIRECRAWL_BASE;
  process.env.FIRECRAWL_BASE = "http://127.0.0.1:1";
  const res = await post({ claim: "Klaim yang cukup panjang untuk diuji" });
  process.env.FIRECRAWL_BASE = saved;
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /Pencarian sumber gagal/);
});

// Real tesseract.js PSM 3 output for a detik.com screenshot (one paragraph per entry).
const L = (text: string, x0: number, y0: number, x1: number, y1: number): Line => ({ text, x0, y0, x1, y1 });
const detik = [
  [L("— detiknews Q", 33, 8, 601, 52)],
  [L("ome Berita Jabodetabek Internasional Huku", 18, 88, 701, 106)],
  [L("Prihatin Kabut Asap, Prabowo:", 59, 152, 664, 188), L("Naikkan Statusnya Jadi Bencana", 39, 203, 683, 239), L("Nasional!", 273, 253, 450, 281)],
  [L("Herianto Batubara - detikNews", 205, 314, 517, 329)],
  [L("Selasa, 20 Okt 2026 18:30 WIB", 213, 362, 505, 379)],
];

test("layout: headline is the claim (not the taller logo), date parsed, blocks separate", () => {
  const s = layout(detik);
  assert.equal(s.claim, "Prihatin Kabut Asap, Prabowo: Naikkan Statusnya Jadi Bencana Nasional!");
  assert.equal(s.date, "2026-10-20");
  assert.equal(s.blocks.length, 5);
});

test("layout: headline split into separate paragraphs is merged back, author is not", () => {
  const [logo, nav, [a, b, c], author, date] = detik;
  const s = layout([logo, nav, [a], [b], [c], author, date]);
  assert.equal(s.blocks.length, 5);
  assert.match(s.claim, /^Prihatin .* Nasional!$/);
});

test("layout: empty and noise-only input", () => {
  assert.deepEqual(layout([]), { blocks: [], claim: "", date: "" });
  assert.equal(layout([[L("Q", 0, 0, 10, 10)]]).claim, "");
});

test("findDate: Indonesian formats, rejects nonsense", () => {
  assert.equal(findDate("Selasa, 20 Okt 2026 18:30 WIB"), "2026-10-20");
  assert.equal(findDate("3 Agustus 2025"), "2025-08-03");
  assert.equal(findDate("Rilis 05/11/2024"), "2024-11-05");
  assert.equal(findDate("45 Okt 2026"), "");
  assert.equal(findDate("tidak ada tanggal"), "");
});
