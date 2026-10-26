"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = ["Nyari sumber di web", "Baca artikel pembanding", "Cocokkan temuannya"];

export default function LoadingScan() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass panel scan" role="status" aria-live="polite">
      <div className="scan-line" aria-hidden="true" />
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          <strong>{STEPS[i]}</strong>
        </motion.p>
      </AnimatePresence>
      <p className="dim small">Paling lama setengah menit.</p>
    </div>
  );
}
