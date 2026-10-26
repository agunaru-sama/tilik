"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { cropToBlob, readShot, type Shot } from "../lib/ocr";

type Props = { onShot: (shot: Shot) => void; onType: () => void };

export default function UploadCropper({ onShot, onType }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<PixelCrop>();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  function load(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Itu bukan gambar. Coba file PNG atau JPG.");
    setError("");
    setCrop(undefined);
    setSrc((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  }

  // paste a screenshot straight from the clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => load(e.clipboardData?.files?.[0]);
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function run() {
    if (!imgRef.current) return;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const area = crop && crop.width > 8 && crop.height > 8 ? crop : undefined;
      const blob = await cropToBlob(imgRef.current, area);
      const shot = await readShot(blob, setProgress);
      if (!shot.claim) throw new Error("Teksnya nggak kebaca. Coba crop bagian yang lebih jelas.");
      onShot(shot);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!src) {
    return (
      <div className="glass panel">
        <label
          className="drop"
          data-over={over}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            load(e.dataTransfer.files[0]);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
          <strong>Pilih gambar atau seret ke sini</strong>
          <span className="dim small">Atau langsung paste (Ctrl+V)</span>
          <input className="sr-only" type="file" accept="image/*" onChange={(e) => load(e.target.files?.[0])} />
        </label>
        {error && <p className="err small" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}
        <div className="btn-row">
          <button type="button" className="btn" onClick={onType}>
            Ketik manual aja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass panel">
      <p className="dim small" style={{ marginBottom: "0.9rem" }}>
        Geser untuk menandai bagian yang mau dicek. Kalau tidak dipilih, semuanya dibaca.
      </p>
      <div className="cropwrap">
        <ReactCrop crop={crop} onChange={(c) => setCrop(c as PixelCrop)} onComplete={(c) => setCrop(c)} disabled={busy}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt="Gambar pilihanmu" />
        </ReactCrop>
      </div>
      {busy && (
        <div className="bar" style={{ marginTop: "1rem" }} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
        </div>
      )}
      {error && <p className="err small" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
          {busy ? "Lagi dibaca…" : "Baca teksnya"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => {
            URL.revokeObjectURL(src);
            setSrc(null);
            setCrop(undefined);
          }}
        >
          Pakai gambar lain
        </button>
      </div>
    </div>
  );
}
