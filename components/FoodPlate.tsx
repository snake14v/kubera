"use client";

// Gourmet plating animation for food items — a silver cloche lifts off the
// plate, steam wisps rise, and a sparkle pops. Pure CSS, brand-toned.

const FOOD_EMOJI: Record<string, string> = {
  "Classic Croissant": "🥐",
  "Avocado Toast": "🥑",
  "Cheesecake Slice": "🍰",
};

export default function FoodPlate({ name, animKey }: { name: string; animKey: string }) {
  const emoji = FOOD_EMOJI[name] ?? "🍽️";
  return (
    <div key={animKey} className="relative h-20 w-20 shrink-0">
      {/* steam */}
      {[0, 1].map((s) => (
        <span
          key={s}
          className="pointer-events-none absolute top-2 h-5 w-[3px] rounded-full bg-cream/25 blur-[1px]"
          style={{ left: `${38 + s * 16}%`, animation: `plate-steam 2.2s ease-out ${0.9 + s * 0.4}s infinite` }}
        />
      ))}
      {/* food reveal */}
      <span
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-3xl"
        style={{ animation: "plate-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both" }}
        role="img"
        aria-label={name}
      >
        {emoji}
      </span>
      {/* sparkle */}
      <span className="absolute right-2 top-5 text-xs" style={{ animation: "plate-sparkle 1.8s ease-in-out 1.1s infinite" }}>
        ✨
      </span>
      {/* plate */}
      <div className="absolute bottom-2 left-1/2 h-2.5 w-16 -translate-x-1/2 rounded-[50%] border border-cream/30 bg-cream/15" />
      <div className="absolute bottom-1 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-[50%] bg-cream/10" />
      {/* cloche — lifts away */}
      <div
        className="absolute bottom-3 left-1/2 h-10 w-14 -translate-x-1/2 rounded-t-full border border-cream/35 bg-gradient-to-b from-cream/30 to-cream/10"
        style={{ animation: "cloche-lift 0.7s cubic-bezier(0.5, 0, 0.3, 1) 0.35s both" }}
      >
        <span className="absolute -top-1.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-gold-500/80" />
      </div>
    </div>
  );
}
