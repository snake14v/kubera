"use client";

// OWNER MISSION SUITE — every order, rupee and minute, visualised.
// KPIs · hourly revenue · 7-day trend · top items · type & payment splits ·
// table sittings · breaches. All live from Firestore, charts by the
// in-house kit (TikZ-grade discipline: static, correct, no rAF).

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { KpiTile, BarChart, LineChart, Gauge } from "@/components/charts";
import ExceptionsBoard from "@/components/ExceptionsBoard";
import { fmtDur } from "@/lib/tables";
import { inr } from "@/lib/format";

type Ord = {
  id: string; type: string; total: number; status: string;
  lines?: { name: string; qty: number }[];
  payment?: { method: string; state: string };
  // exception sources consumed by ExceptionsBoard
  name?: string; table?: string | null; pos?: string;
  audit?: { text: string; by: string; atMs: number }[];
  refund?: { amount: number; by: string; atMs: number };
  comp?: { amount: number; reason: string; by: string; atMs: number };
  createdAt?: Timestamp;
};
const IST_OFF = 330 * 60_000;
const dayKey = (ms: number) => new Date(ms + IST_OFF).toISOString().slice(0, 10);

export default function Insights() {
  return <AdminGuard title="Insights">{() => <Suite />}</AdminGuard>;
}

function Suite() {
  const [orders, setOrders] = useState<Ord[]>([]);
  const [sittings, setSittings] = useState<{ openedAtMs: number; closedAtMs: number | null }[]>([]);
  const [breaches, setBreaches] = useState(0);

  useEffect(() => {
    if (!db) return;
    const today = dayKey(Date.now());
    const u1 = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (s) =>
      setOrders(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ord, "id">) })))
    );
    const u2 = onSnapshot(query(collection(db, "table_sessions"), where("date", "==", today)), (s) =>
      setSittings(s.docs.map((d) => d.data() as { openedAtMs: number; closedAtMs: number | null }))
    );
    const u3 = onSnapshot(
      query(collection(db, "form_submissions"), where("date", "==", today), where("form", "==", "FRM-08")),
      (s) => setBreaches(s.size)
    );
    return () => { u1(); u2(); u3(); };
  }, []);

  const M = useMemo(() => {
    const now = Date.now();
    const todayK = dayKey(now);
    const good = orders.filter((o) => o.status !== "cancelled" && o.createdAt?.toMillis);
    const today = good.filter((o) => dayKey(o.createdAt!.toMillis()) === todayK);
    const rev = today.reduce((s, o) => s + o.total, 0);
    const avg = today.length ? rev / today.length : 0;

    // hourly revenue (open hours 7–23)
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);
    const hourly = hours.map((h) => ({
      label: String(h),
      value: today.filter((o) => new Date(o.createdAt!.toMillis() + IST_OFF).getUTCHours() === h).reduce((s, o) => s + o.total, 0),
    }));

    // 7-day revenue + orders
    const days: string[] = Array.from({ length: 7 }, (_, i) => dayKey(now - (6 - i) * 86_400_000));
    const revByDay = days.map((k) => good.filter((o) => dayKey(o.createdAt!.toMillis()) === k).reduce((s, o) => s + o.total, 0));
    const cntByDay = days.map((k) => good.filter((o) => dayKey(o.createdAt!.toMillis()) === k).length);

    // top items today
    const itemMap = new Map<string, number>();
    today.forEach((o) => o.lines?.forEach((l) => itemMap.set(l.name, (itemMap.get(l.name) ?? 0) + l.qty)));
    const top = [...itemMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, qty]) => ({ label: name.length > 10 ? name.slice(0, 9) + "…" : name, value: qty }));

    const split = (f: (o: Ord) => boolean) => today.filter(f).length;
    const upiPaid = today.filter((o) => o.payment?.method === "upi" && o.payment.state === "paid").reduce((s, o) => s + o.total, 0);
    const closed = sittings.filter((s) => s.closedAtMs);
    const avgSit = closed.length ? closed.reduce((s, c) => s + ((c.closedAtMs ?? 0) - c.openedAtMs), 0) / closed.length : 0;
    const done = today.filter((o) => o.status === "done").length;

    return { rev, avg, n: today.length, hourly, days, revByDay, cntByDay, top, upiPaid,
      dinein: split((o) => o.type === "dinein"), pickup: split((o) => o.type === "pickup"), delivery: split((o) => o.type === "delivery"),
      sittings: sittings.length, avgSit, served: done, fulfil: today.length ? Math.round((done / today.length) * 100) : 0 };
  }, [orders, sittings]);

  return (
    <div>
      <AdminNav active="insights" />
      <h1 className="font-display text-3xl font-bold text-cream">Mission suite</h1>
      <p className="mt-1 font-body text-cream/55">Every order, rupee and minute — live.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Revenue · today" value={inr(M.rev)} sub={`${M.n} orders`} accent />
        <KpiTile label="Avg ticket" value={inr(M.avg)} sub="target ₹240 (barbell)" />
        <KpiTile label="UPI verified" value={inr(M.upiPaid)} sub="zero-MDR collections" />
        <KpiTile label="Breaches today" value={String(breaches)} sub={breaches >= 3 ? "review due!" : "4/9-min promises"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-sm border border-cream/10 bg-forest-850 p-5">
          <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">Revenue by hour · today</p>
          <div className="mt-4"><BarChart data={M.hourly} /></div>
        </div>
        <div className="rounded-sm border border-cream/10 bg-forest-850 p-5">
          <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">Last 7 days</p>
          <div className="mt-4">
            <LineChart labels={M.days.map((d) => d.slice(5))} series={[
              { name: "Revenue ₹", color: "#B59556", data: M.revByDay },
              { name: "Orders", color: "#7FC8A9", data: M.cntByDay },
            ]} />
          </div>
        </div>
        <div className="rounded-sm border border-cream/10 bg-forest-850 p-5">
          <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">Top items · today</p>
          <div className="mt-4">{M.top.length ? <BarChart data={M.top} color="#8FB573" /> : <p className="font-body text-sm text-cream/40">No orders yet.</p>}</div>
        </div>
        <div className="rounded-sm border border-cream/10 bg-forest-850 p-5">
          <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">Service & floor</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Gauge value={M.fulfil} label="orders served %" />
            <div className="space-y-2 font-body text-sm text-cream/75">
              <p>🍽 Dine-in <b className="text-cream">{M.dinein}</b> · 🛍 Pickup <b className="text-cream">{M.pickup}</b> · 🛵 Delivery <b className="text-cream">{M.delivery}</b></p>
              <p>🪑 Sittings today <b className="text-cream">{M.sittings}</b></p>
              <p>⏱ Avg sitting <b className="text-cream">{M.avgSit ? fmtDur(M.avgSit) : "—"}</b></p>
              <p>✓ Served <b className="text-cream">{M.served}</b> of {M.n}</p>
            </div>
          </div>
        </div>
      </div>

      {/* every leaked rupee: refunds · cancels · comps · wastage · duplicates · rejects */}
      <div className="mt-6" id="exceptions">
        <ExceptionsBoard orders={orders} />
      </div>

      <p className="mt-6 font-body text-xs text-cream/35">
        Tables view every order in <a className="text-gold-400" href="/admin/orders">Orders</a> · footfall × sales in <a className="text-gold-400" href="/admin/shopsense">ShopSense</a>. Comp an order from its ✎ editor · log wastage from <a className="text-gold-400" href="/admin/inventory">Stock</a>.
      </p>
    </div>
  );
}
