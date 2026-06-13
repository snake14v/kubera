"use client";

// Animated layered drink glass — each ingredient pours in as a coloured
// layer (staggered rise), with a gloss highlight. `extras` (add-ons like
// extra shot / oat milk / whipped cream) pour in as additional layers on
// top; `compact` renders the card/cart-sized glass.
//
// Animation specs:
// - size s/m/l: the glass itself morphs (height/width transition 500ms) —
//   layers are %-based so the pour scales with it. Caller should NOT bake
//   size into animKey (that would remount and kill the morph).
// - temp "iced": gold straw + 2-3 ice cubes drop in (ice-drop) then bob
//   (ice-bob) + rising bubbles.
// - temp "hot": no straw — a mug handle, steam wisps above the rim and a
//   warm glow; bubbles/ice removed.
// - temp null/undefined: neutral (straw + bubbles, no ice) — used on /menu
//   where there's no hot/iced selection.

import type { Ingredient } from "@/lib/menu";

type Size = "s" | "m" | "l";

const DIM: Record<"full" | "compact", Record<Size, string>> = {
  full: { s: "h-36 w-24", m: "h-44 w-28", l: "h-52 w-32" },
  compact: { s: "h-16 w-10", m: "h-20 w-12", l: "h-24 w-[3.4rem]" },
};

// Brew-strength visual spec: three colours, three TEXTURES laid over the
// liquid — mild = soft horizontal bands on a light honey tint, medium =
// fine dot grain, strong = dense dark diagonal grain.
export const STRENGTHS = {
  mild: {
    label: "Mild", color: "#E8C9A0", tint: "rgba(244, 226, 195, 0.20)",
    pattern: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 4px, transparent 4px 10px), radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.14), transparent 55%)",
    patternSize: "auto, 120% 60%",
  },
  medium: {
    label: "Medium", color: "#A9745A", tint: "rgba(92, 58, 35, 0.15)",
    pattern: "radial-gradient(rgba(255,255,255,0.11) 1px, transparent 1.6px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 9px, transparent 9px 18px)",
    patternSize: "7px 7px, auto",
  },
  strong: {
    label: "Strong", color: "#4A2C16", tint: "rgba(28, 15, 6, 0.40)",
    pattern: "repeating-linear-gradient(135deg, rgba(0,0,0,0.24) 0 3px, transparent 3px 7px), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.4px)",
    patternSize: "auto, 5px 5px",
  },
} as const;
export type Strength = keyof typeof STRENGTHS;

export default function DrinkGlass({
  layers,
  animKey,
  extras = [],
  compact = false,
  size = "m",
  temp = null,
  strength = null,
  sugarFree = false,
}: {
  layers: Ingredient[];
  animKey: string;
  extras?: Ingredient[];
  compact?: boolean;
  size?: Size;
  temp?: "hot" | "iced" | null;
  strength?: Strength | null;
  sugarFree?: boolean;
}) {
  const all = [...layers, ...extras];
  const total = all.reduce((s, l) => s + l.pct, 0) || 100;
  let acc = 0;
  const slices = all.map((l, i) => {
    const h = (l.pct / total) * 100;
    const bottom = acc;
    acc += h;
    return { ...l, h, bottom, delay: (compact ? 0.05 : 0.15) + i * (compact ? 0.12 : 0.22) };
  });

  const hot = temp === "hot";
  const iced = temp === "iced";
  const dims = DIM[compact ? "compact" : "full"][size];
  const steam = compact ? [0, 1] : [0, 1, 2];
  const cubes = compact ? [0, 1] : [0, 1, 2];

  return (
    <div key={animKey} className={`relative shrink-0 transition-all duration-500 ${dims} ${compact ? "" : "mx-auto"}`}>
      {/* steam (hot) */}
      {hot &&
        steam.map((s) => (
          <span
            key={s}
            className="pointer-events-none absolute -top-2 z-10 h-4 w-[3px] rounded-full bg-cream/30 blur-[1px]"
            style={{
              left: `${30 + s * 22}%`,
              animation: `plate-steam 2s ease-out ${0.8 + s * 0.45}s infinite`,
            }}
          />
        ))}

      {/* glass body */}
      <div
        className={`absolute inset-x-1 top-2 bottom-0 overflow-hidden border border-cream/30 bg-cream/5 transition-all duration-500 ${
          compact ? "rounded-b-[1.1rem] rounded-t-sm" : "rounded-b-[2.2rem] rounded-t-md"
        }`}
        style={hot ? { boxShadow: "0 0 18px -4px rgba(224, 133, 47, 0.45)" } : undefined}
      >
        {slices.map((s, i) => (
          <div
            key={i}
            className="absolute inset-x-0 origin-bottom"
            style={{
              bottom: `${s.bottom}%`,
              height: `${s.h}%`,
              backgroundColor: s.color,
              opacity: 0.92,
              transform: "scaleY(0)",
              animation: `glass-pour 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${s.delay}s forwards`,
            }}
          />
        ))}
        {/* brew-strength tint + texture over the poured liquid */}
        {strength && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundColor: STRENGTHS[strength].tint,
              backgroundImage: STRENGTHS[strength].pattern,
              backgroundSize: STRENGTHS[strength].patternSize,
              mixBlendMode: "multiply",
              animation: "glass-pour 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both",
              transformOrigin: "bottom",
            }}
          />
        )}
        {/* pour stream — a thin falling column while the layers rise */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 origin-top rounded-full"
          style={{
            width: compact ? 2.5 : 4,
            height: "100%",
            background: "linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.12))",
            animation: `pour-stream ${(slices.length * (compact ? 0.12 : 0.22) + 0.9).toFixed(2)}s ease-in ${compact ? 0.02 : 0.1}s both`,
          }}
        />
        {/* foam cap settling on top of the finished pour */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-[50%]"
          style={{
            top: "-2%",
            height: "10%",
            background: "linear-gradient(rgba(255,252,243,0.85), rgba(244,236,221,0.35))",
            animation: `foam-settle 0.7s cubic-bezier(0.34, 1.4, 0.64, 1) ${(slices.length * (compact ? 0.12 : 0.22) + 0.5).toFixed(2)}s both`,
          }}
        />
        {/* gloss */}
        <div className={`pointer-events-none absolute inset-y-0 rounded-full bg-white/15 blur-[1px] ${compact ? "left-1 w-1.5" : "left-1.5 w-2.5"}`} />
        {/* ice cubes (iced) */}
        {iced &&
          cubes.map((c) => (
            <span
              key={c}
              className={`pointer-events-none absolute rounded-[3px] border border-white/40 bg-white/20 backdrop-blur-[1px] ${
                compact ? "h-2.5 w-2.5" : "h-4 w-4"
              }`}
              style={{
                left: `${18 + c * 26}%`,
                top: `${16 + (c % 2) * 12}%`,
                transform: `rotate(${-12 + c * 14}deg)`,
                animation: `ice-drop 0.6s cubic-bezier(0.34, 1.4, 0.64, 1) ${0.5 + c * 0.18}s both, ice-bob 2.8s ease-in-out ${1.2 + c * 0.3}s infinite`,
              }}
            />
          ))}
        {/* bubbles (cold drinks only) */}
        {!hot &&
          (compact ? [0] : [0, 1, 2]).map((b) => (
            <span
              key={b}
              className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white/30"
              style={{
                left: `${28 + b * 22}%`,
                bottom: "8%",
                animation: `glass-bubble 2.6s ease-in ${1 + b * 0.55}s infinite`,
              }}
            />
          ))}
      </div>

      {/* condensation beads sliding down an iced glass */}
      {iced &&
        (compact ? [0, 1] : [0, 1, 2, 3]).map((d) => (
          <span
            key={"drip" + d}
            className="pointer-events-none absolute w-[3px] rounded-full bg-white/45 blur-[0.5px]"
            style={{
              height: compact ? 5 : 8,
              left: `${10 + d * 24}%`,
              top: "30%",
              animation: `drip-slide ${2.4 + d * 0.5}s ease-in ${1.4 + d * 0.9}s infinite`,
            }}
          />
        ))}
      {/* latte-art rosetta drawn into a hot cup (full size) */}
      {hot && !compact && (
        <svg viewBox="0 0 40 18" className="pointer-events-none absolute left-1/2 top-[14%] w-1/2 -translate-x-1/2 opacity-80">
          <path
            d="M20 16 C16 12 24 11 20 8 C17 5.5 23 5 20 2.5 M20 16 C13 13 12 9 15 7 M20 16 C27 13 28 9 25 7"
            fill="none"
            stroke="#F4ECDD"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="60"
            strokeDashoffset="60"
            style={{ animation: "art-draw 1.4s ease-out 1.6s forwards" }}
          />
        </svg>
      )}
      {/* rim */}
      <div className="absolute inset-x-0 top-1 h-1.5 rounded-full border border-cream/35 bg-cream/10" />
      {sugarFree && (
        <span className={`pointer-events-none absolute -top-1 ${compact ? "right-0 text-[10px]" : "right-1 text-sm"}`} title="Sugar-free">
          🌿
        </span>
      )}

      {/* mug handle (hot) */}
      {hot && (
        <span
          className={`pointer-events-none absolute rounded-r-full border-2 border-l-0 border-cream/35 ${
            compact ? "-right-1.5 top-1/3 h-5 w-2.5" : "-right-3 top-1/3 h-9 w-4"
          }`}
        />
      )}

      {/* straw (cold drinks) */}
      {!hot && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 rotate-[14deg] rounded-full bg-gold-500/80 ${
            compact ? "-top-2 h-6 w-1" : "-top-4 h-12 w-1.5"
          }`}
        />
      )}
    </div>
  );
}
