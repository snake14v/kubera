"use client";

// CASHIER — tab 1 of 5. Payment-first queue: UPI verify (Mark PAID),
// counter collections, today's takings split, one tap to punch a new
// order. Money actions are PIN-signed via StaffGate.

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, arrayUnion, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db, isAdmin, firebaseEnabled } from "@/lib/firebase";
import { orderCode, ORDERABLE, CATEGORIES, ADDONS, priceFor, SIZE_LABEL, lineKey, type OrderableItem, type SizeKey, type AddonPick } from "@/lib/orders";
import { inr } from "@/lib/format";
import { TABLE_COUNT } from "@/lib/tables";
import { usePresence } from "@/lib/presence";
import StaffGate, { useStaffGate } from "@/components/StaffGate";
import { type StaffMember } from "@/lib/staff";
import { connectPrinter, printReceipt, printerName } from "@/lib/print";
import OpsNav from "@/components/OpsNav";

type Ord = {
  id: string; type: string; total: number; name: string; status: string;
  table?: string | null; pickupIn?: string | null;
  payment?: { method: "counter" | "upi"; state: string };
  createdAt?: Timestamp;
};

type BillLine = { item: OrderableItem; size: SizeKey | null; temp: "hot" | "iced" | null; addons: AddonPick[]; qty: number };
const SIZES: SizeKey[] = ["s", "m", "l"];
const lineUnit = (b: BillLine) => priceFor(b.item, b.size) + b.addons.reduce((s, a) => s + a.price, 0);
const N_TABLES = TABLE_COUNT;

export default function Cashier() {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  useEffect(() => (auth ? onAuthStateChanged(auth, setUser) : undefined), []);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "staff_members"), (s) =>
      setStaff(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffMember, "id">) })).filter((m) => m.active !== false))
    );
  }, []);
  return (
    <StaffGate staff={staff}>
      <Till user={user} />
    </StaffGate>
  );
}

function Till({ user }: { user: User | null }) {
  const { requireOperator } = useStaffGate();
  const [orders, setOrders] = useState<Ord[]>([]);
  // one-screen billing
  const [cat, setCat] = useState<string>(CATEGORIES[0]);
  const [bill, setBill] = useState<BillLine[]>([]);
  const [openLine, setOpenLine] = useState<number | null>(null); // which line's customiser is open
  const [table, setTable] = useState(""); // "" = takeaway, else "1".."10"
  const [pay, setPay] = useState<"counter" | "upi">("counter");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  // same till runs as the Waiter tab on /waiter
  const isWaiter = typeof window !== "undefined" && window.location.pathname.startsWith("/waiter");
  usePresence(isWaiter ? "waiter" : "cashier", isWaiter ? "Waiter" : "Cashier");
  const admin = isAdmin(user?.email);

  const billTotal = bill.reduce((s, b) => s + lineUnit(b) * b.qty, 0);

  // CDS mirror: the guest-facing screen shows the bill (with animated glasses)
  // as it's rung up — every size / temp / add-on change pushes instantly.
  useEffect(() => {
    if (!db || !admin || isWaiter) return;
    const t = setTimeout(() => {
      void setDoc(doc(db!, "settings", "cashier_live"), {
        lines: bill.map((b) => ({
          name: b.item.name,
          size: b.size,
          temp: b.temp,
          addons: b.addons.map((a) => a.name),
          qty: b.qty,
          price: lineUnit(b),
        })),
        total: billTotal,
        pay,
        atMs: Date.now(),
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill, pay, admin]);

  function tapItem(item: OrderableItem) {
    setBill((prev) => {
      // a fresh tap rings up the item's default config (M / iced / no add-ons)
      const size: SizeKey | null = item.prices ? "m" : null;
      const temp: "hot" | "iced" | null = item.tempChoice ? "iced" : null;
      // only merge when the FULL line config matches (id + size + temp + add-ons),
      // exactly like the customer cart — different size/temp/add-ons = a new line
      const key = lineKey(item.id, size, temp, []);
      const i = prev.findIndex((b) => lineKey(b.item.id, b.size, b.temp, b.addons) === key);
      if (i >= 0) return prev.map((b, j) => (j === i ? { ...b, qty: b.qty + 1 } : b));
      return [...prev, { item, size, temp, addons: [], qty: 1 }];
    });
  }

  const setLine = (i: number, patch: Partial<BillLine>) =>
    setBill((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleAddon = (i: number, a: AddonPick) =>
    setBill((p) => p.map((x, j) => (j === i ? { ...x, addons: x.addons.some((y) => y.name === a.name) ? x.addons.filter((y) => y.name !== a.name) : [...x.addons, a] } : x)));

  async function charge() {
    if (!db || bill.length === 0 || busy) return;
    setBusy(true);
    const op = await requireOperator();
    if (!op) {
      setBusy(false);
      return;
    }
    try {
      const ref = await addDoc(collection(db, "orders"), {
        type: table.trim() ? "dinein" : "pickup",
        table: table.trim() || null,
        pickupIn: table.trim() ? null : "ASAP",
        lines: bill.map((b) => ({
          name: b.item.name,
          size: b.size,
          temp: b.temp,
          addons: b.addons,
          unitPrice: lineUnit(b),
          qty: b.qty,
        })),
        subtotal: billTotal,
        discount: 0,
        coupon: null,
        total: billTotal,
        name: `Counter · ${op.name}`,
        phone: "counter",
        uid: null,
        email: null,
        memberCode: null,
        status: "new",
        pos: "cashier",
        payment: { method: pay, state: pay === "upi" ? "pending" : "counter" },
        createdAt: serverTimestamp(),
      });
      setDone(`${orderCode(ref.id)} — ${inr(billTotal)} ${pay === "upi" ? "(UPI pending)" : "taken at counter"}`);
      setTimeout(() => setDone(""), 5000);
      setBill([]);
      setOpenLine(null);
      setTable("");
      // clear the guest-facing mirror
      void setDoc(doc(db, "settings", "cashier_live"), { lines: [], total: 0, pay: "counter", atMs: Date.now() }).catch(() => {});
    } catch {
      setDone("Couldn't place — is this tablet on the shop account?");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!db || !admin) return;
    return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (s) =>
      setOrders(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ord, "id">) })))
    );
  }, [admin]);

  if (!firebaseEnabled)
    return (
      <main className="flex min-h-screen items-center justify-center bg-forest-950 p-8 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-cream">Cashier</p>
          <p className="mt-2 font-body text-sm text-cream/55">Firebase isn&rsquo;t configured yet — add the NEXT_PUBLIC_FIREBASE_* env vars (see FIREBASE-SETUP.md), then reload.</p>
        </div>
      </main>
    );

  if (!admin)
    return (
      <main className="flex min-h-screen items-center justify-center bg-forest-950 p-8 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-cream">Cashier</p>
          <p className="mt-2 font-body text-sm text-cream/55">Sign this tablet in once with the shop account.</p>
          <a href="/login" className="mt-5 inline-block rounded-full bg-gold-500 px-6 py-3 font-body text-xs font-bold uppercase tracking-brand text-forest-950">Sign in →</a>
        </div>
      </main>
    );

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const today = orders.filter((o) => (o.createdAt?.toMillis?.() ?? 0) >= todayStart.getTime() && o.status !== "cancelled");
  const upiPaid = today.filter((o) => o.payment?.method === "upi" && o.payment.state === "paid").reduce((s, o) => s + o.total, 0);
  const counterDue = today.filter((o) => (o.payment?.method ?? "counter") === "counter").reduce((s, o) => s + o.total, 0);
  const toVerify = orders.filter((o) => o.status !== "cancelled" && o.payment?.method === "upi" && o.payment.state !== "paid");
  const toApprove = orders.filter((o) => o.status === "pending");
  const active = orders.filter((o) => ["new", "preparing", "ready"].includes(o.status));

  // mobile dine-in orders wait here until the waiter approves them
  async function decide(o: Ord, approve: boolean) {
    const op = await requireOperator();
    if (!op || !db) return;
    await updateDoc(doc(db, "orders", o.id), {
      status: approve ? "new" : "cancelled",
      audit: arrayUnion({
        text: approve ? "APPROVED → sent to kitchen" : "REJECTED by waiter",
        by: op.name,
        atMs: Date.now(),
      }),
    }).catch(() => setDone("Couldn't update — is this tablet on the shop account?"));
  }

  async function markPaid(o: Ord) {
    const op = await requireOperator();
    if (!op || !db) return;
    await updateDoc(doc(db, "orders", o.id), {
      payment: { method: "upi", state: "paid" },
      audit: arrayUnion({ text: "UPI marked PAID", by: op.name, atMs: Date.now() }),
    }).catch(() => {});
  }

  return (
    <main className="min-h-screen bg-forest-950 p-5 text-cream">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-2xl font-bold">ORB<span className="rgb-text">É</span>AN <span className="text-gold-400">CASHIER</span></p>
        <span className="flex gap-2">
          <button
            onClick={() => connectPrinter().then((n) => setDone(`Printer connected: ${n}`)).catch((e) => setDone(String(e.message ?? e)))}
            className="rounded-full border border-cream/20 px-4 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500"
          >
            🖨 {printerName() ?? "Connect printer"}
          </button>
          <a href="/order" className="rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">+ New counter order</a>
        </span>
      </div>

      <div className="mt-2"><OpsNav /></div>

      {done && (
        <p className="mt-3 rounded-sm border border-[#3E7C5A]/50 bg-[#3E7C5A]/15 px-4 py-2.5 font-body text-sm text-[#7fcb9b]">✓ {done}</p>
      )}

      {/* ── one-screen billing: grid → bill → charge ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-cream/10 bg-forest-850 p-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
                className={`min-h-[40px] shrink-0 rounded-full px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand ${cat === c ? "bg-gold-500/20 text-gold-400" : "border border-cream/15 text-cream/50"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {ORDERABLE.filter((i) => i.category === cat).map((i) => (
              <button key={i.id} onClick={() => tapItem(i)}
                className="min-h-[64px] rounded-lg border border-cream/10 bg-forest-900 p-3 text-left transition-colors hover:border-gold-500/50 active:bg-gold-500/10">
                <p className="font-body text-sm font-bold leading-tight text-cream">{i.name}</p>
                <p className="mt-1 font-body text-xs text-gold-400">{inr(priceFor(i, i.prices ? "m" : null))}{i.prices ? " · M" : ""}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-lg border border-gold-500/30 bg-forest-850 p-4">
          <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">Bill</p>
          <div className="mt-2 flex-1 space-y-2">
            {bill.length === 0 && <p className="font-body text-sm text-cream/35">Tap items to ring them up.</p>}
            {bill.map((b, i) => {
              const canCustomise = b.item.customizable;
              const open = openLine === i;
              return (
                <div key={b.item.id + i} className="rounded-md bg-forest-900/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-body text-sm font-bold text-cream">{b.item.name}</span>
                    <span className="font-body text-sm tabular-nums text-gold-400">{inr(lineUnit(b) * b.qty)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {/* explicit S / M / L */}
                    {b.size &&
                      SIZES.map((s) => (
                        <button key={s} onClick={() => setLine(i, { size: s })} aria-pressed={b.size === s}
                          className={`min-h-[36px] min-w-[36px] rounded-full px-2.5 font-body text-[11px] font-bold uppercase ${b.size === s ? "bg-gold-500/25 text-gold-400" : "border border-cream/15 text-cream/50"}`}>
                          {s}
                        </button>
                      ))}
                    {/* hot / iced */}
                    {b.temp && (
                      <span className="flex overflow-hidden rounded-full border border-cream/15">
                        {(["hot", "iced"] as const).map((t) => (
                          <button key={t} onClick={() => setLine(i, { temp: t })} aria-pressed={b.temp === t}
                            className={`min-h-[36px] px-3 font-body text-[11px] font-bold uppercase ${b.temp === t ? "bg-gold-500/25 text-gold-400" : "text-cream/50"}`}>
                            {t}
                          </button>
                        ))}
                      </span>
                    )}
                    {canCustomise && (
                      <button onClick={() => setOpenLine(open ? null : i)} aria-expanded={open}
                        className={`min-h-[36px] rounded-full px-3 font-body text-[11px] font-bold uppercase ${b.addons.length || open ? "bg-gold-500/20 text-gold-400" : "border border-cream/15 text-cream/50"}`}>
                        + Add{b.addons.length ? ` ·${b.addons.length}` : ""}
                      </button>
                    )}
                    <span className="ml-auto flex items-center gap-1">
                      <button onClick={() => setBill((p) => p.map((x, j) => (j === i ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0))}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/70" aria-label="less">−</button>
                      <span className="w-6 text-center font-body text-sm font-bold tabular-nums">{b.qty}</span>
                      <button onClick={() => setLine(i, { qty: b.qty + 1 })}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/70" aria-label="more">+</button>
                    </span>
                  </div>
                  {/* add-ons */}
                  {open && canCustomise && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-cream/10 pt-2">
                      {ADDONS.map((a) => {
                        const on = b.addons.some((y) => y.name === a.name);
                        return (
                          <button key={a.name} onClick={() => toggleAddon(i, a)}
                            className={`flex items-center justify-between rounded-md px-2.5 py-2 font-body text-[11px] ${on ? "bg-gold-500/15 text-gold-400" : "bg-forest-850 text-cream/60"}`}>
                            <span className="truncate">{on ? "✓ " : ""}{a.name}</span>
                            <span className="shrink-0">+{a.price}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* table selector — T1..T10 buttons + Takeaway, no typing */}
          <p className="mt-3 font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">Table</p>
          <div className="mt-1.5 grid grid-cols-6 gap-1.5">
            <button onClick={() => setTable("")} aria-pressed={table === ""}
              className={`col-span-2 min-h-[40px] rounded-md font-body text-[11px] font-bold uppercase tracking-brand ${table === "" ? "bg-gold-500/25 text-gold-400" : "border border-cream/15 text-cream/55"}`}>
              🛍 Takeaway
            </button>
            {Array.from({ length: N_TABLES }, (_, k) => String(k + 1)).map((t) => (
              <button key={t} onClick={() => setTable(t)} aria-pressed={table === t}
                className={`min-h-[40px] rounded-md font-body text-sm font-bold ${table === t ? "bg-gold-500/25 text-gold-400" : "border border-cream/15 text-cream/55"}`}>
                T{t}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {(["counter", "upi"] as const).map((m) => (
              <button key={m} onClick={() => setPay(m)} aria-pressed={pay === m}
                className={`min-h-[40px] flex-1 rounded-full border py-2 font-body text-[11px] font-bold uppercase tracking-brand ${pay === m ? "border-gold-500 bg-gold-500/15 text-gold-400" : "border-cream/15 text-cream/50"}`}>
                {m === "counter" ? "💵 Cash / card" : "⚡ UPI"}
              </button>
            ))}
          </div>
          <button disabled={bill.length === 0 || busy} onClick={() => void charge()}
            className="mt-3 rounded-full bg-gold-500 py-3.5 font-body text-sm font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-40">
            Charge {inr(billTotal)}
          </button>
        </div>
      </div>

      {/* today's takings */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Today · UPI verified", inr(upiPaid), "#7fcb9b"],
          ["Today · counter (cash/card)", inr(counterDue), "#E0A23C"],
          ["Orders today", String(today.length), "#8d76c0"],
        ].map(([k, v, c]) => (
          <div key={k as string} className="rounded-lg border border-cream/10 bg-forest-850 p-4" style={{ borderTop: `3px solid ${c}` }}>
            <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">{k}</p>
            <p className="mt-1 font-display text-2xl font-bold" style={{ color: c as string }}>{v}</p>
          </div>
        ))}
      </div>

      {/* mobile dine-in orders awaiting waiter approval */}
      {toApprove.length > 0 && (
        <>
          <h2 className="mt-6 font-display text-lg font-bold text-gold-400">
            ☑ Approve to kitchen <span className="text-cream/40">{toApprove.length}</span>
          </h2>
          <div className="mt-2 space-y-2">
            {toApprove.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold-500/40 bg-gold-500/5 px-4 py-3">
                <span className="min-w-0 font-body text-sm">
                  <span className="font-display font-bold text-gold-400">{orderCode(o.id)}</span>
                  <span className="ml-2 font-bold text-cream/85">{o.type === "dinein" ? `TABLE ${o.table}` : o.type}</span>
                  <span className="ml-2 text-cream/60">{o.name} · {inr(o.total)}</span>
                </span>
                <span className="flex gap-2">
                  <button onClick={() => void decide(o, true)} className="rounded-full bg-[#3E7C5A] px-5 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-cream hover:bg-[#4e9c72]">
                    ✓ Approve → kitchen
                  </button>
                  <button onClick={() => void decide(o, false)} className="rounded-full border border-red-400/50 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-red-300 hover:bg-red-500/10">
                    ✗ Reject
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* UPI to verify */}
      <h2 className="mt-6 font-display text-lg font-bold">UPI to verify <span className="text-cream/40">{toVerify.length}</span></h2>
      <div className="mt-2 space-y-2">
        {toVerify.length === 0 && <p className="font-body text-sm text-cream/40">Nothing pending — every UPI order is verified ✓</p>}
        {toVerify.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/30 bg-forest-850 px-4 py-3">
            <span className="font-body text-sm">
              <span className="font-display font-bold text-gold-400">{orderCode(o.id)}</span>
              <span className="ml-2 text-cream/60">{o.name} · {inr(o.total)}</span>
              <span className={`ml-2 font-bold uppercase ${o.payment?.state === "claimed" ? "text-amber-300" : "text-cream/40"}`}>
                {o.payment?.state === "claimed" ? "customer says paid" : "awaiting payment"}
              </span>
            </span>
            <button onClick={() => void markPaid(o)} className="rounded-full border border-[#3E7C5A] px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-[#7fcb9b] hover:bg-[#3E7C5A]/20">
              Bank alert seen — mark PAID ✓
            </button>
          </div>
        ))}
      </div>

      {/* live queue (read-only here; bumping lives on KDS/staff) */}
      <h2 className="mt-6 font-display text-lg font-bold">Live queue <span className="text-cream/40">{active.length}</span></h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-cream/10 bg-forest-850 px-4 py-3 font-body text-sm">
            <span className="min-w-0 truncate">
              <span className="font-display font-bold text-gold-400">{orderCode(o.id)}</span>
              <span className="ml-2 text-cream/60">{o.type === "dinein" ? `T${o.table}` : o.type} · {inr(o.total)} · {o.status}</span>
            </span>
            <button
              onClick={() =>
                printReceipt({
                  code: orderCode(o.id),
                  lines: (o as unknown as { lines?: { name: string; size?: string | null; temp?: string | null; qty: number; unitPrice?: number }[] }).lines ?? [],
                  total: o.total,
                  table: o.table,
                  payment: o.payment?.method === "upi" ? `UPI ${o.payment.state}` : "pay at counter",
                }).catch(() => setDone("Connect the printer first (🖨 button above)."))
              }
              className="shrink-0 rounded-full border border-cream/15 px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-cream/55 hover:border-gold-500"
            >
              🖨
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
