"use client";

import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import UploadCropper from "../components/UploadCropper";
import OcrEditor from "../components/OcrEditor";
import LoadingScan from "../components/LoadingScan";
import Brand from "../components/Brand";
import VerdictCard, { type Result } from "../components/VerdictCard";

type Stage =
  | { name: "upload" }
  | { name: "edit"; text: string; date: string; blocks: string[] }
  | { name: "loading" }
  | { name: "result"; data: Result }
  | { name: "error"; message: string; text: string; date: string };

export default function Page() {
  const [stage, setStage] = useState<Stage>({ name: "upload" });

  async function verify(claim: string, date: string) {
    setStage({ name: "loading" });
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim, date }),
        signal: AbortSignal.timeout(70_000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Server error (${res.status})`);
      setStage({ name: "result", data: json as Result });
    } catch (e) {
      setStage({ name: "error", message: (e as Error).message, text: claim, date });
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="shell">
        <Brand />

        <AnimatePresence mode="wait">
          <motion.div key={stage.name} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
            {stage.name === "upload" && (
              <>
                <h1>Validasi klaim dalam hitungan detik</h1>
                <p className="tagline">bukan opini, murni data</p>
                <UploadCropper onShot={(s) => setStage({ name: "edit", text: s.claim, date: s.date, blocks: s.blocks })} onType={() => setStage({ name: "edit", text: "", date: "", blocks: [] })} />
                <p className="dim small note">Unggah tangkapan layar. Teks dibaca langsung di perangkatmu, gambarnya tidak pernah dikirim ke mana-mana.</p>
              </>
            )}

            {stage.name === "edit" && (
              <OcrEditor initialText={stage.text} initialDate={stage.date} blocks={stage.blocks} onSubmit={verify} onBack={() => setStage({ name: "upload" })} />
            )}

            {stage.name === "loading" && <LoadingScan />}

            {stage.name === "result" && <VerdictCard data={stage.data} onReset={() => setStage({ name: "upload" })} />}

            {stage.name === "error" && (
              <div className="glass panel">
                <h2>Gagal ngecek</h2>
                <p className="err" role="alert" style={{ margin: "0.8rem 0 0" }}>
                  {stage.message}
                </p>
                <div className="btn-row">
                  <button type="button" className="btn btn-primary" onClick={() => verify(stage.text, stage.date)}>
                    Ulangi
                  </button>
                  <button type="button" className="btn" onClick={() => setStage({ name: "edit", text: stage.text, date: stage.date, blocks: [] })}>
                    Edit teks
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
