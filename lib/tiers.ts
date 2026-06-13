// Loyalty tiers — 5 slabs, white → gold. Ranked on how often you come,
// how much you've ordered, and beans earned, measured over the CURRENT
// QUARTER (so every 3 months the slate wipes and everyone re-ranks).
// Thresholds below are per-quarter (≈ monthly slabs × 3).

export type Tier = {
  name: string;
  color: string; // sticker / frame colour
  ink: string; // text on the colour
  minVisits: number; // visits this quarter (any-of with spend)
  minSpend: number; // ₹ this quarter
};

export const TIERS: Tier[] = [
  { name: "White", color: "#F4ECDD", ink: "#3a2a18", minVisits: 0, minSpend: 0 },
  { name: "Silver", color: "#C9CDD3", ink: "#2b2f36", minVisits: 9, minSpend: 3000 },
  { name: "Bronze", color: "#C98A5E", ink: "#2e1a0c", minVisits: 18, minSpend: 7500 },
  { name: "Emerald", color: "#3E7C5A", ink: "#EAF5EE", minVisits: 30, minSpend: 15000 },
  { name: "Gold", color: "#B59556", ink: "#14160E", minVisits: 45, minSpend: 27000 },
];

/** Start of the current quarter (IST-ish; calendar quarters). */
export function quarterStartMs(now = Date.now()): number {
  const d = new Date(now);
  const qMonth = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), qMonth, 1).getTime();
}

export function quarterLabel(now = Date.now()): string {
  const d = new Date(now);
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}

/** Highest tier whose visit OR spend slab is met. Beans = ₹/10. */
export function tierFor(visits: number, spend: number): Tier {
  let t = TIERS[0];
  for (const tier of TIERS) if (visits >= tier.minVisits || spend >= tier.minSpend) t = tier;
  return t;
}

/** Compute a guest's quarter stats from their orders (cancelled excluded). */
export function quarterStats(
  orders: { total: number; status: string; createdAtMs: number | null }[]
): { visits: number; spend: number; beans: number } {
  const q0 = quarterStartMs();
  const mine = orders.filter((o) => o.status !== "cancelled" && (o.createdAtMs ?? 0) >= q0);
  const spend = mine.reduce((s, o) => s + (o.total ?? 0), 0);
  return { visits: mine.length, spend, beans: Math.floor(spend / 10) };
}
