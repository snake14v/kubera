// Papa's-style dynamic time allocation per order: beverages carry the 4-min
// promise, food the 9-min one, +1 min per extra item beyond two, capped 15.
// Progress drains green → amber → red; past 100% = alarm territory.

const FOODISH = /croissant|toast|cheesecake|bake/i;

export function allocMins(lines: { name: string; qty: number }[]): number {
  const items = lines.reduce((s, l) => s + l.qty, 0);
  const hasFood = lines.some((l) => FOODISH.test(l.name));
  return Math.min(15, (hasFood ? 9 : 4) + Math.max(0, items - 2));
}

export function drain(elapsedMs: number, alloc: number) {
  const pct = Math.min(100, (elapsedMs / (alloc * 60_000)) * 100);
  const color = pct >= 100 ? "#D24B5A" : pct >= 66 ? "#E0852F" : "#3E7C5A";
  return { pct, color, overdue: pct >= 100 };
}
