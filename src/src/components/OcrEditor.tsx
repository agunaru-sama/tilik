"use client";

import { useState } from "react";

type Props = {
  initialText: string;
  initialDate?: string;
  blocks?: string[];
  onSubmit: (claim: string, date: string) => void;
  onBack: () => void;
};

export default function OcrEditor({ initialText, initialDate = "", blocks = [], onSubmit, onBack }: Props) {
  const [claim, setClaim] = useState(initialText);
  const [date, setDate] = useState(initialDate);
  const ok = claim.trim().length >= 10 && claim.length <= 1000;

  return (
    <form
      className="glass panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSubmit(claim.trim(), date);
      }}
    >
      <h2>Cek teksnya dulu</h2>
      <p className="dim small" style={{ margin: "0.4rem 0 1.4rem" }}>
        Kalau ada yang salah baca, benerin di sini.
      </p>
      <div className="field">
        <label htmlFor="claim">Judul atau klaim yang mau dicek</label>
        <textarea id="claim" className="input" rows={6} value={claim} maxLength={1000} onChange={(e) => setClaim(e.target.value)} placeholder="Ketik atau paste klaimnya di sini" />
        {!ok && <span className="dim small">Kependekan, minimal 10 karakter.</span>}
      </div>
      {blocks.length > 1 && (
        <div className="field">
          <span className="dim small">Yang kepilih bukan itu? Tap bagian yang pas:</span>
          {blocks.map((b, i) => (
            <button key={i} type="button" className="btn" style={{ textAlign: "left", justifyContent: "flex-start" }} onClick={() => setClaim(b.slice(0, 1000))}>
              {b.length > 90 ? `${b.slice(0, 90)}…` : b}
            </button>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="date">Tanggal beritanya (boleh kosong)</label>
        <input id="date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={!ok}>
          Cek sekarang
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Kembali
        </button>
      </div>
    </form>
  );
}
