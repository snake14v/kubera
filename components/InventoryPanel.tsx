"use client";

// SUPPLY-CHAIN CONSOLE — inventory, vendors, purchases & dues. Shared by
// the Staff Portal tile and /admin/inventory.
// · categories + search + low-stock filter · cost/unit → live stock value
// · ±moves and stocktake SET, PIN-signed with per-item append logs
// · Excel: one-tap CSV export, CSV import (add or update by name)
// · purchases ledger per vendor: record bills, track PAID vs DUE (we track
//   accounts — payments themselves happen outside), receive stock against
//   a purchase. Writes ride the shop account.

import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, arrayUnion, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStaffGate } from "@/components/StaffGate";

export const INV_CATEGORIES = ["Beans & Tea", "Matcha", "Dairy & Alt-milk", "Syrups & Sauces", "Juice Produce", "Bakery", "Packaging", "Cleaning", "Equipment", "Other"] as const;
// Wastage reasons — each waste log also lands in ops_events so the owner's
// exceptions board can price the loss (qty × cost/unit) on a live timeline.
const WASTE_REASONS = ["Expired", "Spilled", "Failed drink", "Spoiled", "Breakage", "Other"];

type Item = {
  id: string; name: string; unit: string; qty: number; lowAt: number;
  category?: string; costPerUnit?: number; vendorId?: string | null;
  log?: { text: string; by: string; atMs: number }[];
};
type Vendor = { id: string; name: string; phone: string; supplies: string };
type Purchase = {
  id: string; vendorId: string; amount: number; note: string;
  paid: boolean; atMs: number; by: string; paidAtMs?: number | null;
};

const field =
  "rounded-full border border-cream/15 bg-forest-900 px-4 py-2.5 font-body text-sm text-cream outline-none placeholder:text-cream/35 focus:border-gold-500";
const inr = (n: number) => "₹" + Math.round(n ?? 0).toLocaleString("en-IN");

export default function InventoryPanel() {
  const { requireOperator } = useStaffGate();
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [err, setErr] = useState("");
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // forms
  const [nName, setNName] = useState(""); const [nUnit, setNUnit] = useState("kg");
  const [nQty, setNQty] = useState("0"); const [nLow, setNLow] = useState("2");
  const [nCat, setNCat] = useState<string>(INV_CATEGORIES[0]); const [nCost, setNCost] = useState("0"); const [nVendor, setNVendor] = useState("");
  const [vName, setVName] = useState(""); const [vPhone, setVPhone] = useState(""); const [vSupplies, setVSupplies] = useState("");
  const [pVendor, setPVendor] = useState(""); const [pAmount, setPAmount] = useState(""); const [pNote, setPNote] = useState(""); const [pPaid, setPPaid] = useState(false);
  // inline per-item mini-forms (never native prompt/confirm — they freeze tabs)
  const [wasteFor, setWasteFor] = useState<string | null>(null); const [wQty, setWQty] = useState("1"); const [wReason, setWReason] = useState(WASTE_REASONS[0]);
  const [setFor, setSetFor] = useState<string | null>(null); const [sQty, setSQty] = useState("");

  useEffect(() => {
    if (!db) return;
    const u1 = onSnapshot(collection(db, "inventory"), (s) =>
      setItems(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) })).sort((a, b) => a.name.localeCompare(b.name))));
    const u2 = onSnapshot(collection(db, "vendors"), (s) =>
      setVendors(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Vendor, "id">) })).sort((a, b) => a.name.localeCompare(b.name))));
    const u3 = onSnapshot(collection(db, "purchases"), (s) =>
      setPurchases(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Purchase, "id">) })).sort((a, b) => b.atMs - a.atMs)));
    return () => { u1(); u2(); u3(); };
  }, []);

  const signed = async <T,>(fn: (by: string) => Promise<T>) => {
    const op = await requireOperator();
    if (!op || !db) return;
    try { await fn(op.name); } catch { setErr("Write failed — is this tablet on the shop account?"); }
  };

  const move = (it: Item, delta: number, kind: string) =>
    signed(async (by) => {
      const qty = Math.max(0, Math.round((it.qty + delta) * 100) / 100);
      await updateDoc(doc(db!, "inventory", it.id), {
        qty, updatedAtMs: Date.now(),
        log: arrayUnion({ text: `${kind} ${Math.abs(delta)} ${it.unit} → ${qty} ${it.unit}`, by, atMs: Date.now() }),
      });
    });

  const stocktake = (it: Item) => {
    const v = Number(sQty);
    if (sQty.trim() === "" || !isFinite(v) || v < 0) { setErr("Stocktake needs a valid count."); return; }
    void signed(async (by) => {
      await updateDoc(doc(db!, "inventory", it.id), {
        qty: v, updatedAtMs: Date.now(),
        log: arrayUnion({ text: `stocktake SET ${it.qty} → ${v} ${it.unit}`, by, atMs: Date.now() }),
      });
      setSetFor(null); setSQty("");
    });
  };

  // waste = stock down + priced ops_event for the owner's exceptions timeline.
  // One atomic batch: the decrement and the loss event land together or not
  // at all. Qty is clamped to stock on hand so losses are never over-priced.
  const logWaste = (it: Item) => {
    const raw = Number(wQty);
    if (!isFinite(raw) || raw <= 0) { setErr("Waste needs a valid quantity."); return; }
    const w = Math.min(Math.round(raw * 100) / 100, it.qty);
    if (w <= 0) { setErr(`${it.name} has no stock to waste.`); return; }
    void signed(async (by) => {
      const qty = Math.round((it.qty - w) * 100) / 100;
      const batch = writeBatch(db!);
      batch.update(doc(db!, "inventory", it.id), {
        qty, updatedAtMs: Date.now(),
        log: arrayUnion({ text: `WASTED ${w} ${it.unit} — ${wReason} → ${qty} ${it.unit}`, by, atMs: Date.now() }),
      });
      batch.set(doc(collection(db!, "ops_events")), {
        kind: "wastage", refId: it.id, label: it.name, qty: w, unit: it.unit,
        amount: Math.round(w * (it.costPerUnit ?? 0)), reason: wReason, by, atMs: Date.now(), createdAt: serverTimestamp(),
      });
      await batch.commit();
      setWasteFor(null); setWQty("1"); setErr("");
    });
  };

  const addItem = () =>
    signed(async (by) => {
      if (!nName.trim()) return;
      await addDoc(collection(db!, "inventory"), {
        name: nName.trim(), unit: nUnit, qty: Number(nQty) || 0, lowAt: Number(nLow) || 0,
        category: nCat, costPerUnit: Number(nCost) || 0, vendorId: nVendor || null, updatedAtMs: Date.now(),
        log: [{ text: `item created · ${nQty} ${nUnit}`, by, atMs: Date.now() }], createdAt: serverTimestamp(),
      });
      setNName(""); setNQty("0");
    });

  const addVendor = () =>
    signed(async (by) => {
      if (!vName.trim()) return;
      await addDoc(collection(db!, "vendors"), { name: vName.trim(), phone: vPhone.trim(), supplies: vSupplies.trim(), addedBy: by, createdAt: serverTimestamp() });
      setVName(""); setVPhone(""); setVSupplies("");
    });

  const addPurchase = () =>
    signed(async (by) => {
      if (!pVendor || !Number(pAmount)) return;
      await addDoc(collection(db!, "purchases"), {
        vendorId: pVendor, amount: Number(pAmount), note: pNote.trim(), paid: pPaid,
        atMs: Date.now(), by, paidAtMs: pPaid ? Date.now() : null, createdAt: serverTimestamp(),
      });
      setPAmount(""); setPNote(""); setPPaid(false);
    });

  const markPaid = (p: Purchase) =>
    signed(async () => { await updateDoc(doc(db!, "purchases", p.id), { paid: true, paidAtMs: Date.now() }); });

  // ── Excel: CSV export / import ──
  function exportCsv() {
    const head = "name,category,unit,qty,lowAt,costPerUnit,vendor,stockValue";
    const rows = items.map((i) =>
      [i.name, i.category ?? "", i.unit, i.qty, i.lowAt, i.costPerUnit ?? 0, vendors.find((v) => v.id === i.vendorId)?.name ?? "", ((i.costPerUnit ?? 0) * i.qty).toFixed(2)]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["﻿" + [head, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orbean-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function importCsv(file: File) {
    void file.text().then((txt) =>
      signed(async (by) => {
        const lines = txt.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
        const head = lines[0].toLowerCase();
        const idx = (k: string) => head.split(",").findIndex((h) => h.replace(/"/g, "").trim() === k);
        const [iN, iC, iU, iQ, iL, iCo] = ["name", "category", "unit", "qty", "lowat", "costperunit"].map(idx);
        let added = 0, updated = 0;
        for (const line of lines.slice(1)) {
          const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
          const name = cells[iN]; if (!name) continue;
          const data = {
            category: cells[iC] || "Other", unit: cells[iU] || "pcs",
            qty: Number(cells[iQ]) || 0, lowAt: Number(cells[iL]) || 0, costPerUnit: Number(cells[iCo]) || 0,
          };
          const existing = items.find((it) => it.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            await updateDoc(doc(db!, "inventory", existing.id), { ...data, updatedAtMs: Date.now(), log: arrayUnion({ text: `CSV import update → ${data.qty} ${data.unit}`, by, atMs: Date.now() }) });
            updated++;
          } else {
            await addDoc(collection(db!, "inventory"), { name, ...data, vendorId: null, updatedAtMs: Date.now(), log: [{ text: `CSV import · ${data.qty} ${data.unit}`, by, atMs: Date.now() }], createdAt: serverTimestamp() });
            added++;
          }
        }
        setErr(`CSV: ${added} added, ${updated} updated ✓`);
      })
    );
  }

  // ── derived ──
  const shown = items.filter((i) =>
    (cat === "All" || (i.category ?? "Other") === cat) &&
    (!lowOnly || i.qty <= i.lowAt) &&
    (!q.trim() || i.name.toLowerCase().includes(q.toLowerCase())));
  const low = items.filter((i) => i.qty <= i.lowAt);
  const stockValue = items.reduce((s, i) => s + (i.costPerUnit ?? 0) * i.qty, 0);
  const dues = useMemo(() => {
    const m = new Map<string, { total: number; due: number }>();
    for (const p of purchases) {
      const e = m.get(p.vendorId) ?? { total: 0, due: 0 };
      e.total += p.amount; if (!p.paid) e.due += p.amount;
      m.set(p.vendorId, e);
    }
    return m;
  }, [purchases]);
  const totalDue = [...dues.values()].reduce((s, d) => s + d.due, 0);
  const vendorName = (id?: string | null) => vendors.find((v) => v.id === id)?.name ?? "—";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">Inventory <span className="font-body text-sm text-cream/40">stock value {inr(stockValue)}</span></h2>
          <span className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="rounded-full border border-cream/20 px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500">⬇ Export CSV</button>
            <button onClick={() => fileRef.current?.click()} className="rounded-full border border-cream/20 px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500">⬆ Import CSV</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
          </span>
        </div>
        {low.length > 0 && (
          <p className="mt-2 animate-pulse rounded-full bg-red-500/15 px-4 py-1.5 font-body text-xs font-bold text-red-300">
            ⚠ reorder: {low.map((i) => i.name).join(", ")}
          </p>
        )}
        {err && <p className="mt-2 font-body text-sm text-gold-400">{err}</p>}

        {/* filters */}
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
          {["All", ...INV_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
              className={`shrink-0 rounded-full px-3.5 py-2 font-body text-[10px] font-bold uppercase tracking-brand ${cat === c ? "bg-gold-500/20 text-gold-400" : "border border-cream/10 text-cream/45"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input className={field + " flex-1"} placeholder="🔍 Search stock…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={() => setLowOnly((v) => !v)} aria-pressed={lowOnly}
            className={`rounded-full px-4 font-body text-[10px] font-bold uppercase tracking-brand ${lowOnly ? "bg-red-500/20 text-red-300" : "border border-cream/15 text-cream/50"}`}>
            ⚠ Low only
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {shown.length === 0 && <p className="font-body text-sm text-cream/40">Nothing here — add items or import a CSV.</p>}
          {shown.map((it) => {
            const isLow = it.qty <= it.lowAt;
            return (
              <div key={it.id} className={`rounded-lg border px-4 py-3 ${isLow ? "border-red-400/50 bg-red-500/5" : "border-cream/10 bg-forest-850"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="font-body text-sm font-bold text-cream">{it.name}</span>
                    <span className="ml-2 rounded-full bg-forest-900 px-2 py-0.5 font-body text-[9px] uppercase tracking-brand text-cream/45">{it.category ?? "Other"}</span>
                    <span className="ml-2 font-body text-xs text-cream/40">{vendorName(it.vendorId)}{it.costPerUnit ? ` · ${inr(it.costPerUnit)}/${it.unit}` : ""}</span>
                  </span>
                  <span className={`font-display text-lg font-bold tabular-nums ${isLow ? "text-red-300" : "text-gold-400"}`}>{it.qty} {it.unit}</span>
                  <span className="flex gap-1.5">
                    <button onClick={() => void move(it, -1, "used")} className="h-10 w-10 rounded-full border border-cream/20 text-cream/70 hover:border-cRose">−1</button>
                    <button onClick={() => void move(it, +1, "received")} className="h-10 w-10 rounded-full border border-cream/20 text-cream/70 hover:border-gold-500">+1</button>
                    <button onClick={() => void move(it, +5, "received")} className="h-10 rounded-full border border-cream/20 px-3 text-cream/70 hover:border-gold-500">+5</button>
                    <button onClick={() => { setSetFor(setFor === it.id ? null : it.id); setSQty(String(it.qty)); setWasteFor(null); }} aria-expanded={setFor === it.id} className="h-10 rounded-full border border-gold-500/40 px-3 font-body text-[10px] font-bold uppercase text-gold-400 hover:bg-gold-500/10">SET</button>
                    <button onClick={() => { setWasteFor(wasteFor === it.id ? null : it.id); setWQty("1"); setWReason(WASTE_REASONS[0]); setSetFor(null); }} aria-expanded={wasteFor === it.id} className="h-10 rounded-full border border-[#C9716B]/50 px-3 font-body text-[10px] font-bold uppercase text-[#e09a94] hover:bg-[#C9716B]/10">🗑 waste</button>
                  </span>
                </div>
                {setFor === it.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-forest-900 px-3 py-2">
                    <span className="font-body text-[10px] font-bold uppercase tracking-brand text-gold-400">Stocktake — actual count</span>
                    <input className={field + " w-24 !py-1.5"} type="number" value={sQty} onChange={(e) => setSQty(e.target.value)} aria-label="Actual count" />
                    <span className="font-body text-xs text-cream/45">{it.unit}</span>
                    <button onClick={() => stocktake(it)} className="rounded-full bg-gold-500 px-4 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-forest-950">Set count</button>
                  </div>
                )}
                {wasteFor === it.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-[#C9716B]/10 px-3 py-2">
                    <span className="font-body text-[10px] font-bold uppercase tracking-brand text-[#e09a94]">Waste</span>
                    <input className={field + " w-20 !py-1.5"} type="number" min="0" value={wQty} onChange={(e) => setWQty(e.target.value)} aria-label="Waste qty" />
                    <span className="font-body text-xs text-cream/45">{it.unit}</span>
                    <select className={field + " !py-1.5"} value={wReason} onChange={(e) => setWReason(e.target.value)} aria-label="Waste reason">
                      {WASTE_REASONS.map((r) => <option key={r} className="bg-forest-900">{r}</option>)}
                    </select>
                    <button onClick={() => logWaste(it)} className="rounded-full bg-[#C9716B] px-4 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-forest-950">Log waste {Number(wQty) > 0 && it.costPerUnit ? `· ${inr(Number(wQty) * it.costPerUnit)}` : ""}</button>
                  </div>
                )}
                <button onClick={() => setOpenLog(openLog === it.id ? null : it.id)} className="mt-1 font-body text-[10px] font-bold uppercase tracking-brand text-cream/40 hover:text-gold-400">
                  Log {openLog === it.id ? "▴" : "▾"} · low at {it.lowAt} {it.unit} · value {inr((it.costPerUnit ?? 0) * it.qty)}
                </button>
                {openLog === it.id && (
                  <div className="mt-1 space-y-0.5">
                    {(it.log ?? []).slice(-6).reverse().map((l, i) => (
                      <p key={i} className="font-body text-[11px] text-cream/50">
                        {new Date(l.atMs).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} — {l.text} <span className="text-cream/30">· {l.by}</span>
                      </p>
                    ))}
                    <button onClick={() => void signed(async () => deleteDoc(doc(db!, "inventory", it.id)).then(() => {}))} className="mt-1 font-body text-[10px] font-bold uppercase text-red-300/70 hover:text-red-300">delete item</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* add item */}
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-cream/10 bg-forest-850 p-4">
          <input className={field + " w-40"} placeholder="Item name" value={nName} onChange={(e) => setNName(e.target.value)} />
          <select className={field} value={nCat} onChange={(e) => setNCat(e.target.value)}>
            {INV_CATEGORIES.map((c) => <option key={c} className="bg-forest-900">{c}</option>)}
          </select>
          <select className={field} value={nUnit} onChange={(e) => setNUnit(e.target.value)}>
            {["kg", "g", "L", "ml", "pcs", "tins", "packs", "boxes"].map((u) => <option key={u} className="bg-forest-900">{u}</option>)}
          </select>
          <input className={field + " w-20"} type="number" placeholder="Qty" value={nQty} onChange={(e) => setNQty(e.target.value)} />
          <input className={field + " w-24"} type="number" placeholder="Low at" value={nLow} onChange={(e) => setNLow(e.target.value)} />
          <input className={field + " w-24"} type="number" placeholder="₹/unit" value={nCost} onChange={(e) => setNCost(e.target.value)} />
          <select className={field} value={nVendor} onChange={(e) => setNVendor(e.target.value)}>
            <option value="" className="bg-forest-900">Vendor…</option>
            {vendors.map((v) => <option key={v.id} value={v.id} className="bg-forest-900">{v.name}</option>)}
          </select>
          <button onClick={() => void addItem()} className="rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">Add item</button>
        </div>
      </div>

      {/* vendors + purchases/dues */}
      <div>
        <h2 className="font-display text-2xl font-bold">
          Vendors & accounts{" "}
          {totalDue > 0 && <span className="rounded-full bg-amber-500/20 px-3 py-1 font-body text-xs font-bold text-amber-300">dues {inr(totalDue)}</span>}
        </h2>
        <div className="mt-4 space-y-2">
          {vendors.map((v) => {
            const d = dues.get(v.id);
            return (
              <div key={v.id} className="rounded-lg border border-cream/10 bg-forest-850 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-body text-sm font-bold text-cream">{v.name}</p>
                  {d && d.due > 0
                    ? <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-body text-[10px] font-bold text-amber-300">DUE {inr(d.due)}</span>
                    : <span className="font-body text-[10px] font-bold uppercase text-[#7fcb9b]">settled ✓</span>}
                </div>
                <p className="font-body text-xs text-cream/55">
                  {v.phone && <a className="text-gold-400" href={`tel:${v.phone}`}>📞 {v.phone}</a>}
                  {v.supplies && <span className="ml-2">{v.supplies}</span>}
                  {d && <span className="ml-2 text-cream/35">lifetime {inr(d.total)}</span>}
                </p>
              </div>
            );
          })}
          <div className="space-y-2 rounded-lg border border-cream/10 bg-forest-850 p-4">
            <input className={field + " w-full"} placeholder="Vendor name" value={vName} onChange={(e) => setVName(e.target.value)} />
            <div className="flex gap-2">
              <input className={field + " flex-1"} placeholder="Phone" value={vPhone} onChange={(e) => setVPhone(e.target.value)} />
              <input className={field + " flex-1"} placeholder="Supplies" value={vSupplies} onChange={(e) => setVSupplies(e.target.value)} />
            </div>
            <button onClick={() => void addVendor()} className="rounded-full bg-gold-500 px-5 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-forest-950">Add vendor</button>
          </div>
        </div>

        <h3 className="mt-6 font-display text-lg font-bold">Purchases ledger</h3>
        <div className="mt-2 space-y-2 rounded-lg border border-cream/10 bg-forest-850 p-4">
          <div className="flex flex-wrap gap-2">
            <select className={field + " flex-1"} value={pVendor} onChange={(e) => setPVendor(e.target.value)}>
              <option value="" className="bg-forest-900">Vendor…</option>
              {vendors.map((v) => <option key={v.id} value={v.id} className="bg-forest-900">{v.name}</option>)}
            </select>
            <input className={field + " w-28"} type="number" placeholder="₹ bill" value={pAmount} onChange={(e) => setPAmount(e.target.value)} />
          </div>
          <input className={field + " w-full"} placeholder="What (10kg beans, 40L milk…)" value={pNote} onChange={(e) => setPNote(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => setPPaid((v) => !v)} aria-pressed={pPaid}
              className={`rounded-full px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand ${pPaid ? "bg-[#3E7C5A]/25 text-[#7fcb9b]" : "border border-amber-300/40 text-amber-300"}`}>
              {pPaid ? "✓ paid now" : "◌ on credit (due)"}
            </button>
            <button onClick={() => void addPurchase()} className="rounded-full bg-gold-500 px-5 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-forest-950">Record purchase</button>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          {purchases.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-forest-850 px-3 py-2 font-body text-xs">
              <span className="min-w-0 truncate text-cream/70">
                <b className="text-cream">{vendorName(p.vendorId)}</b> · {inr(p.amount)} {p.note && <span className="text-cream/45">· {p.note}</span>}
                <span className="ml-1 text-cream/35">{new Date(p.atMs).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
              </span>
              {p.paid
                ? <span className="shrink-0 font-bold uppercase text-[#7fcb9b]">paid ✓</span>
                : <button onClick={() => void markPaid(p)} className="shrink-0 rounded-full border border-amber-300/40 px-3 py-1 font-bold uppercase text-amber-300 hover:bg-amber-500/10">mark paid</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
