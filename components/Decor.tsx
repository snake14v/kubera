"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LeafIcon, SparkleIcon } from "./icons";

function Bean({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="12" rx="6" ry="9" transform="rotate(28 12 12)" />
      <path d="M9.5 5c2.2 4.6 2.2 9.4 0 14" transform="rotate(28 12 12)" />
    </svg>
  );
}

type Item = { left: string; top: string; size: number; dur: number; delay: number; type: "leaf" | "bean" | "sparkle" };

const ITEMS: Item[] = [
  { left: "7%", top: "24%", size: 30, dur: 7.5, delay: 0, type: "leaf" },
  { left: "86%", top: "30%", size: 22, dur: 9, delay: 1.1, type: "bean" },
  { left: "72%", top: "62%", size: 18, dur: 8, delay: 0.5, type: "sparkle" },
  { left: "18%", top: "70%", size: 24, dur: 10, delay: 1.6, type: "bean" },
  { left: "50%", top: "14%", size: 16, dur: 6.5, delay: 0.9, type: "sparkle" },
  { left: "92%", top: "72%", size: 20, dur: 8.5, delay: 0.3, type: "leaf" },
];

/** Drifting gold beans/leaves/sparkles for page-header backgrounds. */
export function FloatingDecor() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {ITEMS.map((it, i) => (
        <motion.div
          key={i}
          className="absolute text-gold-500"
          style={{ left: it.left, top: it.top, width: it.size, height: it.size }}
          animate={{ y: [0, -16, 0], rotate: [0, 14, 0], opacity: [0.12, 0.32, 0.12] }}
          transition={{ duration: it.dur, delay: it.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          {it.type === "leaf" && <LeafIcon className="h-full w-full" />}
          {it.type === "sparkle" && <SparkleIcon className="h-full w-full" />}
          {it.type === "bean" && <Bean className="h-full w-full" />}
        </motion.div>
      ))}
    </div>
  );
}

/** Slowly rotating concentric "orbit" rings — a gold brand flourish. */
export function OrbitRings({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden>
      {/* No standalone filled dots — when animations pause (background tabs,
          reduced motion) a lone bright dot reads as a stuck cursor. */}
      <motion.g
        style={{ transformOrigin: "100px 100px" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="92" stroke="currentColor" strokeOpacity="0.16" strokeDasharray="2 7" />
        <circle cx="100" cy="100" r="70" stroke="currentColor" strokeOpacity="0.1" />
      </motion.g>
      <motion.g
        style={{ transformOrigin: "100px 100px" }}
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="50" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="1 8" />
      </motion.g>
    </svg>
  );
}
