// Client-only. The image never leaves the browser; tesseract.js only downloads language data.
export async function cropToBlob(img: HTMLImageElement, area?: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const sx = img.naturalWidth / img.width;
  const sy = img.naturalHeight / img.height;
  const x = area ? area.x * sx : 0;
  const y = area ? area.y * sy : 0;
  const w = area ? area.width * sx : img.naturalWidth;
  const h = area ? area.height * sy : img.naturalHeight;
  const up = w < 700 ? 2 : 1; // small crops read better upscaled
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * up));
  canvas.height = Math.max(1, Math.round(h * up));
  canvas.getContext("2d")!.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memotong gambar"))), "image/png"));
}

export type Line = { text: string; x0: number; y0: number; x1: number; y1: number };
export type Shot = { blocks: string[]; claim: string; date: string };

// PSM 3 = layout analysis. tesseract.js defaults to PSM 6 (one uniform block), which is why everything came out as one paragraph.
export async function readShot(image: Blob, onProgress: (p: number) => void): Promise<Shot> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker(["ind", "eng"], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const { data } = await worker.recognize(image, {}, { blocks: true });
    const paras = (data.blocks ?? []).flatMap((b) => b.paragraphs.map((p) => p.lines.map((l) => ({ text: l.text, ...l.bbox }))));
    return layout(paras);
  } finally {
    await worker.terminate();
  }
}

// A wrapped headline can be split by Tesseract; same column + gap under 0.6 line heights = same block.
function sameBlock(a: Line, b: Line) {
  const gap = b.y0 - a.y1;
  const h = Math.min(a.y1 - a.y0, b.y1 - b.y0);
  return gap >= 0 && gap < 0.6 * h && b.x0 < a.x1 && a.x0 < b.x1;
}

const MONTH: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };
const MONTH_RE = "jan|feb|mar|apr|mei|may|jun|jul|ag[ut]|aug|sep|o[ck]t|nov|de[sc]";

export function findDate(text: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ok = (d: number, m: number) => d >= 1 && d <= 31 && m >= 1 && m <= 12;
  const named = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_RE})[a-z]*\\.?,?\\s+(\\d{4})\\b`, "i"));
  if (named) {
    const d = +named[1], m = MONTH[named[2].toLowerCase().slice(0, 3)];
    if (ok(d, m)) return `${named[3]}-${pad(m)}-${pad(d)}`;
  }
  const num = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/); // dd/mm/yyyy (Indonesian order)
  if (num && ok(+num[1], +num[2])) return `${num[3]}-${pad(+num[2])}-${pad(+num[1])}`;
  return "";
}

export function layout(paras: Line[][]): Shot {
  const merged: Line[][] = [];
  for (const p of paras.filter((p) => p.length)) {
    const prev = merged[merged.length - 1];
    if (prev && sameBlock(prev[prev.length - 1], p[0])) prev.push(...p);
    else merged.push([...p]);
  }
  const blocks = merged
    .map((lines) => ({
      text: lines.map((l) => l.text).join(" ").replace(/\s+/g, " ").trim(),
      h: lines.reduce((s, l) => s + (l.y1 - l.y0), 0) / lines.length,
    }))
    .filter((b) => (b.text.match(/[\p{L}\p{N}]/gu) ?? []).length >= 3); // drop icon noise like "Q"
  // claim = tallest block with real text; a logo is tall but short, body text is long but small
  const long = blocks.filter((b) => b.text.length >= 20);
  const pick = long.length ? long.reduce((a, b) => (b.h > a.h ? b : a)) : blocks.reduce((a, b) => (b.text.length > a.text.length ? b : a), { text: "", h: 0 });
  return { blocks: blocks.map((b) => b.text), claim: pick.text.slice(0, 1000), date: findDate(blocks.map((b) => b.text).join("\n")) };
}
