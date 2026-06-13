"use client";

// ⚠ EXCEPTIONS & LOSSES — the owner's live breach board. One timeline of
// every rupee that leaked: refunds, cancels, comps, wastage, duplicates,
// waiter rejects. Refund/cancel/comp/duplicate/reject events are DERIVED
// live from order docs (refund/comp fields, status, audit trail); wastage
// streams from ops_events (written by the inventory waste flow). Range +
// kind filters, day-grouped timeline, per-staff involvement, CSV export.

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { orderCode } from "@/lib/orders";

export type ExOrder = {
  id: string; total: number; status: string; name?: string; table?: string | null; pos?: string;
  audit?: { text: string; by: string; atMs: number }[];
  refund?: { amount: number; by: string; atMs: number };
  comp?: { amount: number; reason: string; by: string; atMs: number };
  createdAt?: Timestamp;
};
type OpsEvent = { id: string; kind: string; label: string; qty?: number; unit?: string; amount: number; reason?: string; by: string; atMs: number };
type Ev = { id: string; kind: Kind; atMs: number; label: string; amount: number; by: string; reason?: string; dupLoss?: boolean };
type Kind = "refund" | "cancel" | "comp" | "wastage" | "duplicate" | "reject";

const KINDS: Record<Kind, { icon: string; color: string; label: string; loss: boolean }> = {
  refund: { icon: "↩", color: "#E0A23C", label: "Refunds", loss: true },
  comp: { icon: "🎁", color: "#8D76C0", label: "Comps", loss: true },
  wastage: { icon: "🗑", color: "#C9716B", label: "Wastage", loss: true },
  cancel: { icon: "✕", color: "#D24B5A", label: "Cancels", loss: false },
  duplicate: { icon: "⧉", color: "#8B9DE0", label: "Duplicates", loss: false },
  reject: { icon: "🚫", color: "#9aa0a6", label: "Rejects", loss: false },
};
const RANGES = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["all", "All"]] as const;

const inr = (n: number) => "₹" + Math.round(n ?? 0).toLocaleString("en-IN");
const IST_OFF = 330 * 60_000;
const dayKey = (ms: number) => new Date(ms + IST_OFF).toISOString().slice(0, 10);
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function ExceptionsBoard({ orders }: { orders: ExOrder[] }) {
  const [ops, setOps] = useState<OpsEvent[]>([]);
  const [range, setRange] = useState<(typeof RANGES)[number][0]>("7d");
  const [kind, setKind] = useState<Kind | "all">("all");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "ops_events"), (s) =>
      setOps(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OpsEvent, "id">) })))
    );
  }, []);

  const events = useMemo(() => {
    const out: Ev[] = [];
    for (const o of orders) {
      const code = orderCode(o.id);
      const who = `${o.name?.split(" ")[0] ?? "guest"}${o.table ? ` · T${o.table}` : ""}`;
      if (o.refund) out.push({ id: o.id + ":rf", kind: "refund", atMs: o.refund.atMs, amount: o.refund.amount, by: o.refund.by, label: `${code} · ${who}` });
      // a refunded bill that is ALSO comped is one loss, not two — flag the
      // comp so the leakage sum skips it (both rows still show on the timeline)
      if (o.comp) out.push({ id: o.id + ":cp", kind: "comp", atMs: o.comp.atMs, amount: o.comp.amount, by: o.comp.by, reason: o.comp.reason, label: `${code} · ${who}`, dupLoss: !!o.refund });
      if (o.status === "cancelled") {
        const cx = (o.audit ?? []).find((x) => x.text.startsWith("ORDER CANCELLED"));
        const rj = (o.audit ?? []).find((x) => /REJECTED by waiter/.test(x.text));
        // waiter rejects set status:'cancelled' too — those surface as
        // 'reject' events below, so don't double-count them as cancels
        if (cx || !rj)
          out.push({ id: o.id + ":cx", kind: "cancel", atMs: cx?.atMs ?? o.createdAt?.toMillis?.() ?? 0, amount: o.total, by: cx?.by ?? "—", label: `${code} · ${who}` });
      }
      if (o.pos === "duplicate") {
        const a = (o.audit ?? [])[0];
        out.push({ id: o.id + ":dp", kind: "duplicate", atMs: a?.atMs ?? o.createdAt?.toMillis?.() ?? 0, amount: o.total, by: a?.by ?? "—", label: `${code} · ${who}` });
      }
      for (const a of o.audit ?? [])
        if (/REJECTED by waiter/.test(a.text))
          out.push({ id: o.id + ":rj" + a.atMs, kind: "reject", atMs: a.atMs, amount: o.total, by: a.by, label: `${code} · ${who}` });
    }
    for (const e of ops)
      if (e.kind === "wastage")
        out.push({ id: e.id, kind: "wastage", atMs: e.atMs, amount: e.amount, by: e.by, reason: e.reason, label: `${e.label}${e.qty ? ` · ${e.qty} ${e.unit ?? ""}` : ""}` });
    return out.filter((e) => e.atMs > 0).sort((a, b) => b.atMs - a.atMs);
  }, [orders, ops]);

  const inRange = useMemo(() => {
    const cutoff = range === "today" ? Date.parse(dayKey(Date.now()) + "T00:00:00+05:30")
      : range === "7d" ? Date.now() - 7 * 86_400_000
      : range === "30d" ? Date.now() - 30 * 86_400_000 : 0;
    return events.filter((e) => e.atMs >= cutoff);
  }, [events, range]);
  const shown = useMemo(() => inRange.filter((e) => kind === "all" || e.kind === kind), [inRange, kind]);

  const sum = (k: Kind) => inRange.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0);
  const cnt = (k: Kind) => inRange.filter((e) => e.kind === k).length;
  const isLoss = (e: Ev) => KINDS[e.kind].loss && !e.dupLoss;
  const leakage = inRange.reduce((s, e) => s + (isLoss(e) ? e.amount : 0), 0);

  // most involved = loss events only — duplicates/rejects aren't leakage
  const byStaff = useMemo(() => {
    const m = new Map<string, number>();
    inRange.forEach((e) => KINDS[e.kind].loss && e.by !== "—" && m.set(e.by, (m.get(e.by) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [inRange]);

  const days = useMemo(() => {
    const m = new Map<string, Ev[]>();
    shown.forEach((e) => { const k = dayKey(e.atMs); m.set(k, [...(m.get(k) ?? []), e]); });
    return [...m.entries()];
  }, [shown]);

  function exportCsv() {
    const head = "date,time,kind,label,amount,by,reason";
    // leading '=+-@' would execute as a formula in Excel — neutralise
    const safe = (c: unknown) => { const s = String(c); return /^[=+\-@]/.test(s) ? "'" + s : s; };
    const rows = shown.map((e) =>
      [dayKey(e.atMs), hhmm(e.atMs), e.kind, e.label, e.amount, e.by, e.reason ?? ""].map((c) => `"${safe(c).replace(/"/g, '""')}"`).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `orbean-exceptions-${dayKey(Date.now())}.csv`;
    a.click();
  }

  const todayLabel = dayKey(Date.now());
  const yest = dayKey(Date.now() - 86_400_000);

  return (
    <div className="rounded-sm border border-red-400/20 bg-forest-850 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-[10px] font-bold uppercase tracking-brand text-red-300/80">⚠ Exceptions & losses — live</p>
        <span className="flex flex-wrap gap-1.5">
          {RANGES.map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} aria-pressed={range === k}
              className={`rounded-full px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand ${range === k ? "bg-gold-500/20 text-gold-400" : "border border-cream/10 text-cream/45"}`}>
              {l}
            </button>
          ))}
          <button onClick={exportCsv} className="rounded-full border border-cream/15 px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-cream/50 hover:border-gold-500">⬇ CSV</button>
        </span>
      </div>

      {/* loss KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["refund", "comp", "wastage", "cancel"] as Kind[]).map((k) => (
          <div key={k} className="rounded-lg border border-cream/10 bg-forest-900 px-4 py-3">
            <p className="font-body text-[10px] font-bold uppercase tracking-brand" style={{ color: KINDS[k].color }}>{KINDS[k].icon} {KINDS[k].label}</p>
            <p className="mt-1 font-display text-xl font-bold text-cream">{inr(sum(k))}</p>
            <p className="font-body text-[11px] text-cream/40">{cnt(k)} event{cnt(k) === 1 ? "" : "s"}{k === "cancel" ? " · value not always lost" : ""}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-full bg-red-500/10 px-4 py-2 font-body text-xs font-bold text-red-300">
        Total leakage ({RANGES.find(([k]) => k === range)?.[1].toLowerCase()}): {inr(leakage)} — refunds + comps + wastage
        {byStaff.length > 0 && <span className="ml-2 font-normal text-cream/50">· most involved: {byStaff.map(([n, c]) => `${n} (${c})`).join(", ")}</span>}
      </p>

      {/* kind filter */}
      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
        <button onClick={() => setKind("all")} aria-pressed={kind === "all"}
          className={`shrink-0 rounded-full px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand ${kind === "all" ? "bg-gold-500/20 text-gold-400" : "border border-cream/10 text-cream/45"}`}>
          All · {inRange.length}
        </button>
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`shrink-0 rounded-full px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand ${kind === k ? "bg-gold-500/20 text-gold-400" : "border border-cream/10 text-cream/45"}`}>
            {KINDS[k].icon} {KINDS[k].label} · {cnt(k)}
          </button>
        ))}
      </div>

      {/* day-grouped timeline */}
      <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
        {days.length === 0 && (
          <p className="font-body text-sm text-cream/40">
            {inRange.length > 0 && kind !== "all"
              ? `No ${KINDS[kind].label.toLowerCase()} in this range — other kinds have ${inRange.length} event${inRange.length === 1 ? "" : "s"}.`
              : "Clean sheet — no exceptions in this range 🎉"}
          </p>
        )}
        {days.map(([day, evs]) => (
          <div key={day}>
            <p className="sticky top-0 z-10 bg-forest-850 py-1 font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">
              {day === todayLabel ? "Today" : day === yest ? "Yesterday" : new Date(day + "T00:00:00+05:30").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })}
              <span className="ml-2 text-cream/25">{evs.length} event{evs.length === 1 ? "" : "s"} · {inr(evs.reduce((s, e) => s + (isLoss(e) ? e.amount : 0), 0))} lost</span>
            </p>
            <div className="ml-2 border-l border-cream/10">
              {evs.map((e) => (
                <div key={e.id} className="relative py-1.5 pl-5">
                  <span className="absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: KINDS[e.kind].color }} />
                  <p className="font-body text-xs text-cream/80">
                    <span className="text-cream/35">{hhmm(e.atMs)}</span>{" "}
                    <b style={{ color: KINDS[e.kind].color }}>{KINDS[e.kind].icon} {KINDS[e.kind].label.replace(/s$/, "").toLowerCase()}</b>{" "}
                    {e.label} · <b className="text-cream">{inr(e.amount)}</b>
                    {e.reason && <span className="text-cream/50"> — {e.reason}</span>}
                    <span className="text-cream/35"> · {e.by}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
