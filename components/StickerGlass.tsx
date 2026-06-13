// Print-safe drink art: the layered glass in its FINAL poured state as pure
// SVG (no CSS animation — animations print as frame 0 = empty glasses).
// Used on cup + collectible stickers.

import { ingredientsFor, ADDON_LAYERS } from "@/lib/menu";
import { STRENGTHS, type Strength } from "@/components/DrinkGlass";

export default function StickerGlass({
  name,
  addons = [],
  hot = false,
  sugarFree = false,
  strength = null,
  size = 96,
}: {
  name: string;
  addons?: string[];
  hot?: boolean;
  sugarFree?: boolean;
  strength?: Strength | null;
  size?: number;
}) {
  const extras = addons.map((a) => ADDON_LAYERS[a]).filter(Boolean);
  const all = [...ingredientsFor(name), ...extras];
  const total = all.reduce((s, l) => s + l.pct, 0) || 100;
  // glass body: x 18..78, y 14..92 (h 78)
  let y = 92;
  const rects = all.map((l) => {
    const h = (l.pct / total) * 76;
    y -= h;
    return { y, h, color: l.color, key: l.name };
  });
  const st = strength ? STRENGTHS[strength] : null;

  return (
    <svg viewBox="0 0 96 100" width={size} height={(size * 100) / 96} aria-label={name}>
      <defs>
        <clipPath id={`cup-${name.replace(/\W/g, "")}`}>
          <path d="M20 14 h56 v58 a28 22 0 0 1 -56 0 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#cup-${name.replace(/\W/g, "")})`}>
        {rects.map((r, i) => (
          <rect key={i} x="18" y={r.y} width="60" height={r.h + 0.6} fill={r.color} opacity="0.95" />
        ))}
        {st && <rect x="18" y="14" width="60" height="78" fill={st.color} opacity={strength === "strong" ? 0.35 : strength === "mild" ? 0.15 : 0.22} />}
        <rect x="22" y="16" width="4" height="72" fill="#fff" opacity="0.22" rx="2" />
      </g>
      <path d="M20 14 h56 v58 a28 22 0 0 1 -56 0 Z" fill="none" stroke="#7a6a4f" strokeWidth="2.4" />
      <rect x="16" y="10" width="64" height="5" rx="2.5" fill="#d8c9a8" stroke="#7a6a4f" strokeWidth="1.4" />
      {hot ? (
        <>
          <path d="M76 30 h6 a9 9 0 0 1 0 20 h-6" fill="none" stroke="#7a6a4f" strokeWidth="2.4" />
          <path d="M38 6 c-2 -3 2 -5 0 -8 M50 7 c-2 -3 2 -5 0 -8 M62 6 c-2 -3 2 -5 0 -8" stroke="#b9a98a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="52" y="-4" width="4" height="22" rx="2" fill="#B59556" transform="rotate(12 54 8)" />
          <rect x="30" y="30" width="9" height="9" rx="2" fill="#fff" opacity="0.5" transform="rotate(-12 34 34)" />
          <rect x="56" y="42" width="8" height="8" rx="2" fill="#fff" opacity="0.45" transform="rotate(10 60 46)" />
        </>
      )}
      {sugarFree && <text x="84" y="12" fontSize="11">🌿</text>}
    </svg>
  );
}
