"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { demoData, statusColor, type ShopSenseData } from "@/lib/shopsense";
import { KpiTile, BarChart, LineChart, Gauge } from "./charts";

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function ShopSenseDashboard({ user }: { user: User }) {
  const [data, setData] = useState<ShopSenseData>(() => demoData());
  const [mode, setMode] = useState<"demo" | "live">("demo");

  useEffect(() => {
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/shopsense/analytics", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const live = await res.json();
        if (res.ok && live?.mode === "live") {
          setMode("live");
          setData((d) => ({
            ...d,
            mode: "live",
            kpis: {
              ...d.kpis,
              salesToday: live.salesToday ?? d.kpis.salesToday,
            },
          }));
        }
      } catch {
        /* stay on demo */
      }
    })();
  }, [user]);

  const k = data.kpis;

  return (
    <div>
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-cream">ShopSense</h1>
            <span className={`rounded-full px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-brand ${mode === "live" ? "bg-[#3E7C5A]/20 text-[#7fcb9b]" : "bg-gold-500/15 text-gold-400"}`}>
              {mode === "live" ? "● Live" : "Demo data"}
            </span>
          </div>
          <p className="mt-1 font-body text-sm text-cream/55">{data.generatedFor} · retail intelligence · pilot zero</p>
        </div>
        <a href="/admin" className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45 transition-colors hover:text-gold-400">← Admin</a>
      </div>

      {mode === "demo" && (
        <p className="mt-4 rounded-sm border border-gold-500/20 bg-forest-900 px-4 py-3 font-body text-xs text-cream/55">
          Showing simulated data. Connect a SENSE/TRACK node (POST to <span className="font-mono text-gold-400">/api/shopsense/ingest</span>) and set <span className="font-mono text-gold-400">LOYVERSE_TOKEN</span> to go live — see SHOPSENSE-SETUP.md.
        </p>
      )}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Footfall today" value={String(k.footfallToday)} sub="counted at entrance" accent />
        <KpiTile label="In store now" value={String(k.occupancy)} sub="live occupancy" />
        <KpiTile label="Capture rate" value={`${k.captureRatePct}%`} sub="footfall → sale" />
        <KpiTile label="Avg dwell" value={`${k.avgDwellMin}m`} sub="time in store" />
        <KpiTile label="Sales today" value={inr(k.salesToday)} sub={mode === "live" ? "from Loyverse" : "modelled"} />
      </div>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Peak hours" sub="footfall by hour" className="lg:col-span-2">
          <BarChart data={data.hours.map((h) => ({ label: h.hour, value: h.footfall }))} />
        </Card>
        <Card title="Burn vs revenue" sub="efficiency score">
          <div className="flex h-full flex-col items-center justify-center">
            <Gauge value={k.efficiencyScore} label="efficiency" />
            <p className="mt-3 text-center font-body text-xs text-cream/50">
              Depletion velocity vs revenue — higher means less waste per ₹ earned.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="7-day trend" sub="footfall & sales" className="lg:col-span-2">
          <LineChart
            labels={data.week.map((d) => d.day)}
            series={[
              { name: "Footfall", color: "#B59556", data: data.week.map((d) => d.footfall) },
              { name: "Sales", color: "#5B8FB0", data: data.week.map((d) => d.sales) },
            ]}
          />
        </Card>
        <Card title="Devices" sub="edge nodes">
          <ul className="space-y-3">
            {data.devices.map((dv) => (
              <li key={dv.id} className="flex items-center justify-between gap-3 border-b border-cream/10 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-mono text-sm text-cream/90">{dv.id}</p>
                  <p className="font-body text-xs text-cream/45">{dv.type} · {dv.zone}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-brand ${dv.status === "online" ? "bg-[#3E7C5A]/20 text-[#7fcb9b]" : "bg-cream/10 text-cream/45"}`}>
                  {dv.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Burn-rate + alerts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Inventory burn-rate" sub="days to stock-out">
          <table className="w-full text-left font-body text-sm">
            <tbody>
              {data.burn.map((b) => (
                <tr key={b.name} className="border-t border-cream/10 first:border-0">
                  <td className="py-2.5 pr-3 text-cream/85">{b.name}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-cream/55">{b.soldToday}/day</td>
                  <td className="py-2.5 text-right">
                    <span className="font-bold tabular-nums" style={{ color: statusColor(b.status) }}>
                      {b.daysToStockout.toFixed(1)}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Alerts" sub="model mesh">
          <ul className="space-y-3">
            {data.alerts.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.level === "critical" ? "#D24B5A" : a.level === "warn" ? "#E0852F" : "#5B8FB0" }} />
                <div>
                  <p className="font-body text-sm text-cream/80">{a.text}</p>
                  <p className="font-body text-xs text-cream/35">{a.at}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border border-cream/10 bg-forest-850 p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-bold text-cream">{title}</h3>
        {sub && <span className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/35">{sub}</span>}
      </div>
      {children}
    </div>
  );
}
