"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

export type Result = {
  accuracyPercentage: number;
  status: string;
  explanation: string;
  references: { title: string; url: string }[];
  model: string;
  sourceCount: number;
};

const R = 70;
const C = 2 * Math.PI * R;

const tone = (p: number) => (p <= 40 ? "tone-bad" : p <= 60 ? "tone-warn" : "tone-ok");

export default function VerdictCard({ data, onReset }: { data: Result; onReset: () => void }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? data.accuracyPercentage : 0);

  useEffect(() => {
    if (reduce) return setN(data.accuracyPercentage);
    const c = animate(0, data.accuracyPercentage, { duration: 1.2, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [data.accuracyPercentage, reduce]);

  const t = tone(data.accuracyPercentage);

  return (
    <div className="glass panel">
      <div className="verdict-top">
        <div className={`verdict-ring ${t}`} role="img" aria-label={`Tingkat akurasi ${data.accuracyPercentage} persen`}>
          <svg viewBox="0 0 160 160">
            <circle className="ring-track" cx="80" cy="80" r={R} fill="none" strokeWidth="9" />
            <motion.circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: reduce ? C * (1 - data.accuracyPercentage / 100) : C }}
              animate={{ strokeDashoffset: C * (1 - data.accuracyPercentage / 100) }}
              transition={{ duration: reduce ? 0 : 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="ring-value">
            <strong>{n}%</strong>
            <span className="dim small">akurat</span>
          </div>
        </div>
        <div style={{ flex: "1 1 14rem", minWidth: 0 }}>
          <span className={`pill ${t}`}>{data.status}</span>
          <p style={{ marginTop: "0.9rem" }}>{data.explanation}</p>
        </div>
      </div>

      {data.references.length > 0 ? (
        <div style={{ marginTop: "1.6rem" }}>
          <h2 style={{ fontSize: "1.05rem" }}>Sumber</h2>
          <ul className="refs">
            {data.references.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="dim small" style={{ marginTop: "1.4rem" }}>
          Belum ada sumber yang bisa dikutip.
        </p>
      )}

      <p className="dim small" style={{ marginTop: "1.4rem" }}>
        Ini hasil AI dari {data.sourceCount} sumber web ({data.model}). Tetap cek sendiri ya.
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={onReset}>
          Cek yang lain
        </button>
      </div>
    </div>
  );
}
