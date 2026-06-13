// ShopSense — Orbéan's first deployment (pilot zero).
// Edge nodes (ESP32 SENSE/TRACK) POST footfall/occupancy events to /api/shopsense/ingest;
// Loyverse provides the POS revenue feed. This module holds the shared types, a deterministic
// demo generator (so the console is alive before hardware lands), and metric helpers.

export type HourPoint = { hour: string; footfall: number; sales: number };
export type DayPoint = { day: string; footfall: number; sales: number };

export type BurnItem = {
  name: string;
  soldToday: number;
  onHand: number;
  daysToStockout: number;
  status: "ok" | "low" | "critical";
};

export type Alert = { level: "info" | "warn" | "critical"; text: string; at: string };
export type Device = {
  id: string;
  type: "SENSE" | "TRACK";
  zone: string;
  status: "online" | "offline" | "pending";
  lastSeen: string;
};

export type ShopSenseData = {
  mode: "demo" | "live";
  generatedFor: string; // label, e.g. "Orbéan · BTM"
  kpis: {
    footfallToday: number;
    occupancy: number;
    captureRatePct: number; // footfall → paying customer
    avgDwellMin: number;
    salesToday: number;
    efficiencyScore: number; // burn vs revenue, 0–100
  };
  hours: HourPoint[];
  week: DayPoint[];
  burn: BurnItem[];
  alerts: Alert[];
  devices: Device[];
};

const HOURS = ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p"];
// realistic cafe footfall curve (morning + lunch + evening peaks), 0–1 weights
const CURVE = [0.45, 0.7, 0.85, 0.6, 0.95, 1.0, 0.7, 0.5, 0.55, 0.75, 0.9, 0.85, 0.7, 0.5, 0.3];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Deterministic — same output every render (no hydration drift). `peak` scales the numbers. */
export function demoData(peak = 64): ShopSenseData {
  const hours: HourPoint[] = HOURS.map((hour, i) => {
    const footfall = Math.round(CURVE[i] * peak);
    const sales = Math.round(footfall * (0.34 + (i % 3) * 0.04)); // ~34–42% capture
    return { hour, footfall, sales };
  });
  const footfallToday = hours.reduce((s, h) => s + h.footfall, 0);
  const salesCount = hours.reduce((s, h) => s + h.sales, 0);

  const week: DayPoint[] = DAYS.map((day, i) => {
    const w = [0.82, 0.78, 0.85, 0.9, 1.0, 1.15, 0.7][i];
    const ff = Math.round(footfallToday * w);
    return { day, footfall: ff, sales: Math.round(ff * 0.38) };
  });

  const burn: BurnItem[] = [
    { name: "Ceremonial matcha (tin)", soldToday: 38, onHand: 46, daysToStockout: 1.2, status: "critical" },
    { name: "Oat milk (1L)", soldToday: 22, onHand: 60, daysToStockout: 2.7, status: "low" },
    { name: "Single-origin beans (kg)", soldToday: 9, onHand: 41, daysToStockout: 4.6, status: "low" },
    { name: "Strawberry purée (btl)", soldToday: 14, onHand: 88, daysToStockout: 6.3, status: "ok" },
    { name: "Paper cups (16oz)", soldToday: 140, onHand: 2200, daysToStockout: 15.7, status: "ok" },
  ];

  const captureRatePct = Math.round((salesCount / footfallToday) * 100);
  const avgSale = 268;
  const salesToday = salesCount * avgSale;
  const efficiencyScore = 78;

  return {
    mode: "demo",
    generatedFor: "Orbéan · BTM",
    kpis: {
      footfallToday,
      occupancy: 31,
      captureRatePct,
      avgDwellMin: 42,
      salesToday,
      efficiencyScore,
    },
    hours,
    week,
    burn,
    alerts: [
      { level: "critical", text: "Ceremonial matcha runs out in ~1.2 days — reorder now.", at: "2m ago" },
      { level: "warn", text: "Lunch peak (1pm) hit 100% of bar capacity — consider a second hand.", at: "18m ago" },
      { level: "info", text: "Footfall up 15% week-on-week. Saturday is your strongest day.", at: "1h ago" },
      { level: "info", text: "Capture rate 38% — 6pts above the kirana-cafe benchmark.", at: "3h ago" },
    ],
    devices: [
      { id: "OL-SENSE-01", type: "SENSE", zone: "Entrance", status: "pending", lastSeen: "awaiting first node" },
      { id: "OL-TRACK-01", type: "TRACK", zone: "Counter / queue", status: "pending", lastSeen: "awaiting first node" },
    ],
  };
}

export function statusColor(s: BurnItem["status"]) {
  return s === "critical" ? "#D24B5A" : s === "low" ? "#E0852F" : "#3E7C5A";
}
