"use client";

import { useEffect, useState } from "react";

// Grand Opening: Saturday, 12 July 2026 (IST)
const TARGET = new Date("2026-07-12T00:00:00+05:30").getTime();

type T = { d: number; h: number; m: number; s: number };

function calc(): T {
  const diff = Math.max(0, TARGET - Date.now());
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
  };
}

export default function Countdown() {
  // null on first render to avoid hydration mismatch (Date.now is client-only)
  const [t, setT] = useState<T | null>(null);

  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  const units: [string, number | undefined][] = [
    ["Days", t?.d],
    ["Hrs", t?.h],
    ["Min", t?.m],
    ["Sec", t?.s],
  ];

  return (
    <div className="flex gap-3 sm:gap-4">
      {units.map(([label, val]) => (
        <div
          key={label}
          className="min-w-[64px] rounded-sm border border-cream/10 bg-forest-850/60 px-3 py-2.5 text-center sm:min-w-[78px]"
        >
          <div className="font-display text-2xl font-bold tabular-nums text-gold-400 sm:text-3xl">
            {val === undefined ? "––" : String(val).padStart(2, "0")}
          </div>
          <div className="mt-0.5 font-body text-[10px] font-bold uppercase tracking-brand text-cream/50">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
