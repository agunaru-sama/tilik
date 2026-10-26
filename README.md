# CekHoaks

Privacy-first hoax checker. Screenshot -> crop -> local OCR (tesseract.js, layout-aware: headline/source/body/date split) -> pick claim -> Firecrawl search -> LLM fallback chain -> verdict.

## Run
```
cp .env.example .env.local   # fill FIRECRAWL_API_KEY, GEMINI_API_KEY, GROQ_API_KEY
npm install
npm run dev                  # http://localhost:3000
npm test                     # backend tests, mock servers, no keys needed
```
Images never leave the browser. Only the edited text goes to `/api/verify`.
tesseract.js downloads language data (ind, eng) on first OCR.

## Edit models
`TIERS` in `src/lib/ai-fallback-chain.ts`.

## OCR layout
`src/lib/ocr.ts`: Tesseract runs in PSM 3 (layout analysis), lines are grouped into blocks, the claim defaults to the tallest block with 20+ characters, the date is found by regex. The editor lists every block so a wrong pick is one click to fix.
