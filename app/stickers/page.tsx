"use client";

// 🏷 STICKER STUDIO — TRAY MODEL. Die-cut sheets are precious, so you don't
// print a sheet per order: you pick stickers (cup label / collectible card)
// from ANY recent orders into a TRAY, watch the sheet-fill meter, and print
// one ganged A4 when it's worth it. The tray survives reloads (localStorage).
// "Mark printed" also GRANTS each identifiable guest a DIGITAL collectible
// (collectibles/{orderId_line_copy} — deterministic IDs, reprint-safe) that
// appears in their /account gallery. Colour printing = system print dialog.

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { auth, db, isAdmin } from "@/lib/firebase";
import { orderCode } from "@/lib/orders";
import StickerGlass from "@/components/StickerGlass";
import OpsNav from "@/components/OpsNav";
import { TIERS, tierFor, quarterStats, quarterLabel, type Tier } from "@/lib/tiers";
import { phoneKey } from "@/lib/loyalty";
import { BRAND } from "@/lib/brand";
import { type Strength } from "@/components/DrinkGlass";

type Line = { name: string; size?: string | null; temp?: string | null; addons?: { name: string }[]; qty: number };
type Ord = { id: string; name: string; phone: string; uid?: string | null; memberCode?: string | null; total: number; status: string; type: string; table?: string | null; lines: Line[]; createdAt?: Timestamp };

export type TrayItem = {
  // orderId_drinkIdx_copyIdx — doubles as the collectible doc ID. drinkIdx is
  // the index within the FOOD-FILTERED drink list, not order.lines: changing
  // the isFood regex shifts keys for old orders, so treat it as append-only.
  key: string;
  orderId: string; code: string; guestName: string; table?: string | null;
  uid?: string | null; memberCode?: string | null; phone?: string | null;
  drink: { name: string; size?: string | null; temp?: string | null; addons: string[]; sugarFree: boolean; strength: Strength | null };
  tier: { name: string; color: string; ink: string }; quarter: string;
  cup: boolean; collectible: boolean;
};

const TRAY_LS = "orb_sticker_tray_v1";
const DONE_LS = "orb_stickers_printed_v1";
const strengthOf = (names: string[]): Strength | null =>
  names.includes("Strong brew") ? "strong" : names.includes("Mild brew") ? "mild" : null;
const isFood = (n: string) => /croissant|toast|cheesecake/i.test(n);

// Greedy row packing on a 200×272mm printable area: cup 64mm + 4 gap,
// card 48mm + 4 gap, rows of 64mm + 4 gap → 4 rows per A4.
function sheetEstimate(tray: TrayItem[]) {
  const ROW_W = 200, ROWS_PER_SHEET = 4;
  let rowW = 0, rows = 0;
  for (const t of tray)
    for (const w of [t.cup ? 68 : 0, t.collectible ? 52 : 0]) {
      if (!w) continue;
      if (rows === 0 || rowW + w > ROW_W) { rows++; rowW = w; } else rowW += w;
    }
  const sheets = Math.max(1, Math.ceil(rows / ROWS_PER_SHEET));
  const usedRows = rows === 0 ? 0 : (rows - 1) % ROWS_PER_SHEET + rowW / ROW_W;
  return { sheets, fillPct: rows === 0 ? 0 : Math.min(100, Math.round((usedRows / ROWS_PER_SHEET) * 100)) };
}

export default function Stickers() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [armed, setArmed] = useState<"" | "mark" | "clear">("");
  const [msg, setMsg] = useState("");

  useEffect(() => (auth ? onAuthStateChanged(auth, setUser) : undefined), []);
  const admin = isAdmin(user?.email);

  useEffect(() => {
    if (!db || !admin) return;
    return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (s) =>
      setOrders(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ord, "id">) })))
    );
  }, [admin]);

  // tray + printed-set persistence — persist effects skip their mount run so
  // the initial empty state never clobbers what hydration just read
  useEffect(() => {
    try {
      setTray(JSON.parse(localStorage.getItem(TRAY_LS) ?? "[]"));
      setDone(new Set(JSON.parse(localStorage.getItem(DONE_LS) ?? "[]")));
    } catch { /* fresh start */ }
  }, []);
  const skipTray = useRef(true), skipDone = useRef(true);
  useEffect(() => { if (skipTray.current) { skipTray.current = false; return; } localStorage.setItem(TRAY_LS, JSON.stringify(tray)); }, [tray]);
  useEffect(() => { if (skipDone.current) { skipDone.current = false; return; } localStorage.setItem(DONE_LS, JSON.stringify([...done])); }, [done]);
  // armed confirms reset when the tray changes underneath them, and time out
  useEffect(() => { setArmed(""); }, [tray]);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(""), 6000);
    return () => clearTimeout(t);
  }, [armed]);

  const recent = orders.filter((o) => o.status !== "cancelled" && o.lines?.some((l) => !isFood(l.name))).slice(0, 20);
  const order = orders.find((o) => o.id === sel) ?? recent[0] ?? null;

  // guest's tier this quarter (matched across their orders by uid/member/phone)
  const tier: Tier = useMemo(() => {
    if (!order) return TIERS[0];
    const mine = orders
      .filter((o) => (order.uid && o.uid === order.uid) || (order.memberCode && o.memberCode === order.memberCode) || (order.phone && order.phone !== "counter" && o.phone === order.phone))
      .map((o) => ({ total: o.total, status: o.status, createdAtMs: o.createdAt?.toMillis?.() ?? null }));
    const st = quarterStats(mine);
    return tierFor(st.visits, st.spend);
  }, [order, orders]);

  if (!admin)
    return (
      <main className="flex min-h-screen items-center justify-center bg-forest-950 p-8 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-cream">Sticker Studio</p>
          <p className="mt-2 font-body text-sm text-cream/55">Sign this tablet in once with the shop account.</p>
          <a href="/login" className="mt-5 inline-block rounded-full bg-gold-500 px-6 py-3 font-body text-xs font-bold uppercase tracking-brand text-forest-950">Sign in →</a>
        </div>
      </main>
    );

  const drinks = (order?.lines ?? []).filter((l) => !isFood(l.name));
  const inTray = (key: string) => tray.find((t) => t.key === key);

  function unitOf(o: Ord, l: Line, li: number, qi: number): TrayItem {
    const addonNames = (l.addons ?? []).map((a) => a.name);
    return {
      key: `${o.id}_${li}_${qi}`, orderId: o.id, code: orderCode(o.id), guestName: o.name.split(" ")[0], table: o.table ?? null,
      uid: o.uid ?? null, memberCode: o.memberCode ?? null, phone: o.phone ?? null,
      drink: { name: l.name, size: l.size ?? null, temp: l.temp ?? null, addons: addonNames, sugarFree: addonNames.includes("No sugar 🌿"), strength: strengthOf(addonNames) },
      tier: { name: tier.name, color: tier.color, ink: tier.ink }, quarter: quarterLabel(),
      cup: true, collectible: true,
    };
  }

  function toggle(u: TrayItem, kind: "cup" | "collectible") {
    setTray((tr) => {
      const cur = tr.find((t) => t.key === u.key);
      if (!cur) return [...tr, { ...u, cup: kind === "cup", collectible: kind === "collectible" }];
      const next = { ...cur, [kind]: !cur[kind] };
      return next.cup || next.collectible ? tr.map((t) => (t.key === u.key ? next : t)) : tr.filter((t) => t.key !== u.key);
    });
  }

  function addOrder(both: boolean) {
    if (!order) return;
    const units = drinks.flatMap((l, li) => Array.from({ length: l.qty }).map((_, qi) => ({ ...unitOf(order, l, li, qi), cup: both, collectible: true })));
    setTray((tr) => [...tr.filter((t) => !units.some((u) => u.key === t.key)), ...units]);
  }

  // Digital twins go only with collectible CARDS (cup labels are just labels),
  // only once per key (no re-grant on reprint), and only for identifiable
  // guests. Docs are world-readable, so the phone is stored as a HASH —
  // never the raw number.
  async function grantDigitals(items: TrayItem[]) {
    if (!db) return 0;
    let n = 0;
    for (const t of items) {
      if (!t.collectible || done.has(t.key)) continue;
      const rawPhone = t.phone && t.phone !== "counter" ? t.phone : null;
      if (!(t.uid || t.memberCode || rawPhone)) continue; // walk-in counter sale — nobody to credit
      await setDoc(doc(db, "collectibles", t.key), {
        orderId: t.orderId, code: t.code, guestName: t.guestName,
        uid: t.uid ?? null, memberCode: t.memberCode ?? null,
        phoneHash: rawPhone ? await phoneKey(rawPhone) : null,
        drink: t.drink, tier: t.tier, quarter: t.quarter,
        atMs: Date.now(), by: "sticker-studio", createdAt: serverTimestamp(),
      }, { merge: true });
      n++;
    }
    return n;
  }

  async function markPrinted() {
    try {
      const granted = await grantDigitals(tray);
      setDone((d) => new Set([...d, ...tray.map((t) => t.key)]));
      setMsg(`✓ ${tray.length} stickers marked printed · ${granted} digital collectibles granted`);
      setTray([]);
    } catch {
      setMsg("⚠ Grant failed — check this tablet is online & on the shop account, then tap again. Tray kept.");
    }
    setArmed("");
  }

  const est = sheetEstimate(tray);
  const cups = tray.filter((t) => t.cup).length, cards = tray.filter((t) => t.collectible).length;
  const chip = "min-h-[40px] shrink-0 rounded-full px-3 font-body text-[10px] font-bold uppercase tracking-brand";

  return (
    <main className="min-h-screen bg-forest-950 p-5 text-cream print:bg-white print:p-0">
      <div className="print:hidden">
        <p className="font-display text-2xl font-bold">ORB<span className="rgb-text">É</span>AN <span className="text-gold-400">STICKERS</span></p>
        <div className="mt-2"><OpsNav /></div>
        {msg && <p className="mt-2 font-body text-sm text-[#7fcb9b]">{msg}</p>}

        <div className="mt-4 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* ── picker ── */}
          <div>
            <p className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">1 · Pick from recent orders</p>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
              {recent.map((o) => (
                <button key={o.id} onClick={() => setSel(o.id)} aria-pressed={order?.id === o.id}
                  className={`min-h-[44px] shrink-0 rounded-full px-4 font-body text-xs font-bold ${order?.id === o.id ? "bg-gold-500/25 text-gold-400" : "border border-cream/15 text-cream/55"}`}>
                  {orderCode(o.id)} · {o.name.split(" ")[0]} <span className="opacity-50">· {o.status}</span>
                </button>
              ))}
              {recent.length === 0 && <p className="font-body text-sm text-cream/40">No recent orders.</p>}
            </div>

            {order && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-4 py-1.5 font-body text-xs font-bold uppercase tracking-brand" style={{ backgroundColor: tier.color, color: tier.ink }}>
                    ★ {tier.name} · {quarterLabel()}
                  </span>
                  <button onClick={() => addOrder(true)} className={chip + " border border-gold-500/40 text-gold-400 hover:bg-gold-500/10"}>＋ all cup + card</button>
                  <button onClick={() => addOrder(false)} className={chip + " border border-cream/20 text-cream/60 hover:border-gold-500"}>＋ cards only</button>
                </div>
                <div className="mt-3 space-y-2">
                  {drinks.flatMap((l, li) =>
                    Array.from({ length: l.qty }).map((_, qi) => {
                      const u = unitOf(order, l, li, qi);
                      const cur = inTray(u.key);
                      return (
                        <div key={u.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-cream/10 bg-forest-850 px-4 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="font-body text-sm font-bold text-cream">{l.name}</span>
                            <span className="ml-2 font-body text-xs text-cream/45">
                              {[l.size?.toUpperCase(), l.temp, l.qty > 1 ? `№${qi + 1}/${l.qty}` : null].filter(Boolean).join(" · ")}
                            </span>
                            {done.has(u.key) && <span className="ml-2 rounded-full bg-[#3E7C5A]/25 px-2 py-0.5 font-body text-[9px] font-bold uppercase text-[#7fcb9b]">✓ printed</span>}
                          </span>
                          <button onClick={() => toggle(u, "cup")} aria-pressed={!!cur?.cup}
                            className={`${chip} ${cur?.cup ? "bg-gold-500/25 text-gold-400" : "border border-cream/15 text-cream/45"}`}>🥤 cup</button>
                          <button onClick={() => toggle(u, "collectible")} aria-pressed={!!cur?.collectible}
                            className={`${chip} ${cur?.collectible ? "bg-gold-500/25 text-gold-400" : "border border-cream/15 text-cream/45"}`}>🃏 card</button>
                        </div>
                      );
                    })
                  )}
                  {drinks.length === 0 && <p className="font-body text-sm text-cream/40">This order has no drinks.</p>}
                </div>
              </>
            )}
          </div>

          {/* ── tray ── */}
          <div className="rounded-lg border border-gold-500/25 bg-forest-850 p-4">
            <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-400">2 · Tray — gang up, then print one sheet</p>
            <p className="mt-1 font-body text-sm text-cream/70">{cups} cup · {cards} card stickers</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-forest-900">
              <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${est.sheets > 1 ? 100 : est.fillPct}%` }} />
            </div>
            <p className="mt-1 font-body text-xs text-cream/50">
              {tray.length === 0 ? "Empty — add stickers from orders." : est.sheets > 1 ? `Fills ${est.sheets} A4 sheets` : `Sheet fill ~${est.fillPct}% — ${est.fillPct < 70 ? "room for more orders before printing" : "good time to print"}`}
            </p>

            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {tray.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-2 rounded-md bg-forest-900 px-3 py-1.5 font-body text-xs">
                  <span className="min-w-0 truncate text-cream/70">
                    <b className="text-cream">{t.code}</b> · {t.drink.name} <span className="text-cream/40">{[t.cup ? "🥤" : null, t.collectible ? "🃏" : null].filter(Boolean).join(" ")} · {t.guestName}</span>
                  </span>
                  <button onClick={() => setTray((tr) => tr.filter((x) => x.key !== t.key))} className="shrink-0 text-cream/40 hover:text-red-300">✕</button>
                </div>
              ))}
            </div>

            {tray.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => window.print()} className="rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">
                  🖨 Print tray ({est.sheets} sheet{est.sheets > 1 ? "s" : ""})
                </button>
                {armed === "mark" ? (
                  <button onClick={() => void markPrinted()} className="rounded-full bg-[#3E7C5A] px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-cream">tap again to confirm</button>
                ) : (
                  <button onClick={() => setArmed("mark")} className="rounded-full border border-[#3E7C5A] px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-[#7fcb9b]">✓ mark printed + 🎁 grant digitals</button>
                )}
                {armed === "clear" ? (
                  <button onClick={() => { setTray([]); setArmed(""); }} className="rounded-full bg-red-500/30 px-4 py-2.5 font-body text-[10px] font-bold uppercase text-red-200">sure? clear</button>
                ) : (
                  <button onClick={() => setArmed("clear")} className="rounded-full border border-cream/15 px-4 py-2.5 font-body text-[10px] font-bold uppercase text-cream/45">clear tray</button>
                )}
              </div>
            )}
            <p className="mt-2 font-body text-[11px] text-cream/35">Digitals go to signed-in / member / phone-known guests only — walk-in counter sales have no account to credit.</p>
          </div>
        </div>
      </div>

      {/* ── printable ganged sheet (tray only) ──
          Cup and card are SIBLINGS in the flow, never wrapped together: each
          sticker wraps rows independently, which is exactly what the
          sheetEstimate meter models. */}
      <div className="mt-6 flex flex-wrap gap-6 print:mt-0 print:gap-[4mm]">
        {tray.flatMap((t) => {
          const out = [];
          if (t.cup)
            out.push(
              <div key={t.key + "_cup"} className="h-[64mm] w-[64mm] rounded-full p-[5mm] text-center print:break-inside-avoid" style={{ backgroundColor: t.tier.color, color: t.tier.ink }}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-dashed" style={{ borderColor: t.tier.ink + "55" }}>
                  <p className="font-display text-[11px] font-bold tracking-widest">ORBÉAN</p>
                  <StickerGlass name={t.drink.name} addons={t.drink.addons.filter((n) => !/sugar|sweet/i.test(n))} hot={t.drink.temp === "hot"} sugarFree={t.drink.sugarFree} strength={t.drink.strength} size={58} />
                  <p className="mt-0.5 max-w-[46mm] font-display text-[12px] font-bold leading-tight">{t.drink.name}</p>
                  <p className="font-body text-[8px] leading-tight opacity-80">
                    {[t.drink.size?.toUpperCase(), t.drink.temp, ...t.drink.addons.filter((n) => !/brew|sugar|sweet/i.test(n)), t.drink.sugarFree ? "NO SUGAR" : null].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 font-body text-[9px] font-bold">{t.code} · {t.guestName}{t.table ? ` · T${t.table}` : ""}</p>
                </div>
              </div>
            );
          if (t.collectible)
            out.push(
              <div key={t.key + "_card"} className="h-[64mm] w-[48mm] rounded-xl p-[3mm] print:break-inside-avoid" style={{ backgroundColor: t.tier.color, color: t.tier.ink }}>
                <div className="flex h-full w-full flex-col items-center justify-between rounded-lg border-2 p-[2.5mm]" style={{ borderColor: t.tier.ink + "66", backgroundColor: "#14160E" }}>
                  <p className="font-display text-[10px] font-bold tracking-widest" style={{ color: t.tier.color }}>ORBÉAN · COLLECT</p>
                  <StickerGlass name={t.drink.name} addons={t.drink.addons.filter((n) => !/sugar|sweet/i.test(n))} hot={t.drink.temp === "hot"} sugarFree={t.drink.sugarFree} strength={t.drink.strength} size={88} />
                  <div className="text-center">
                    <p className="font-display text-[11px] font-bold leading-tight text-[#E8DFC9]">{t.drink.name}</p>
                    <p className="font-body text-[8px] uppercase tracking-widest" style={{ color: t.tier.color }}>★ {t.tier.name} · {t.quarter}</p>
                    <p className="font-body text-[7px] text-[#E8DFC9]/50">{BRAND.business.name} · powered by {BRAND.name}</p>
                  </div>
                </div>
              </div>
            );
          return out;
        })}
        {tray.length === 0 && <p className="hidden font-body text-sm print:block">Tray is empty.</p>}
      </div>
    </main>
  );
}
