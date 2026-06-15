"use client";

// KITCHEN DISPLAY (KDS) — tab 3 of 5. Tickets oldest-first, aging colours
// on the 4/9-min promises, one-tap bump (PIN-signed via StaffGate).

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { arrayUnion, collection, doc, onSnapshot, orderBy, query, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db, isAdmin, firebaseEnabled } from "@/lib/firebase";
import { useMounted } from "@/lib/useMounted";
import { orderCode, SIZE_LABEL, type SizeKey } from "@/lib/orders";
import { usePresence } from "@/lib/presence";
import StaffGate, { useStaffGate } from "@/components/StaffGate";
import { type StaffMember } from "@/lib/staff";
import { chimeEnabled, playChime } from "@/lib/chime";
import { connectPrinter, printKOT, printerName } from "@/lib/print";
import { allocMins, drain } from "@/lib/orderTiming";
import OpsNav from "@/components/OpsNav";

type Line = { name: string; size: SizeKey | null; temp?: string | null; addons?: { name: string }[]; qty: number };
type Ord = { id: string; type: string; lines: Line[]; table?: string | null; pickupIn?: string | null; status: string; notes?: { text: string; by: string }[]; createdAt?: Timestamp };
const NEXT: Record<string, string> = { new: "preparing", preparing: "ready", ready: "done" };

export default function KDS() {
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
      <Board user={user} />
    </StaffGate>
  );
}

function Board({ user }: { user: User | null }) {
  const { requireOperator } = useStaffGate();
  const [orders, setOrders] = useState<Ord[]>([]);
  const [now, setNow] = useState(Date.now());
  usePresence("kds", "Kitchen Display");
  const admin = isAdmin(user?.email);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // ALARM: any ticket past its allocation → sound + vibrate every 30s
  useEffect(() => {
    const t = setInterval(() => {
      const overdue = orders.some((o) => {
        if (!["new", "preparing"].includes(o.status) || !o.createdAt?.toMillis) return false;
        return drain(Date.now() - o.createdAt.toMillis(), allocMins(o.lines ?? [])).overdue;
      });
      if (overdue && chimeEnabled()) {
        playChime();
        (navigator as Navigator & { vibrate?: (p: number[]) => void }).vibrate?.([400, 150, 400, 150, 600]);
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [orders]);

  async function callCustomer(o: Ord, e: React.MouseEvent) {
    e.stopPropagation();
    const op = await requireOperator();
    if (!op || !db) return;
    await updateDoc(doc(db, "orders", o.id), {
      calledAtMs: Date.now(),
      audit: arrayUnion({ text: "customer called 📣", by: op.name, atMs: Date.now() }),
    }).catch(() => {});
  }
  useEffect(() => {
    if (!db || !admin) return;
    let seen: Set<string> | null = null;
    return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ord, "id">) }));
      const fresh = docs.filter((o) => o.status === "new").map((o) => o.id);
      if (seen && chimeEnabled() && fresh.some((id) => !seen!.has(id))) playChime();
      seen = new Set(docs.map((o) => o.id));
      setOrders(docs);
    });
  }, [admin]);

  const mounted = useMounted();
  if (!mounted) return <main className="min-h-screen bg-forest-950" />;

  if (!firebaseEnabled)
    return (
      <main className="flex min-h-screen items-center justify-center bg-forest-950 p-8 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-cream">Kitchen Display</p>
          <p className="mt-2 font-body text-sm text-cream/55">Firebase isn&rsquo;t configured yet — add the NEXT_PUBLIC_FIREBASE_* env vars (see FIREBASE-SETUP.md), then reload.</p>
        </div>
      </main>
    );

  if (!admin)
    return (
      <main className="flex min-h-screen items-center justify-center bg-forest-950 p-8 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-cream">Kitchen Display</p>
          <p className="mt-2 font-body text-sm text-cream/55">Sign this tablet in once with the shop account.</p>
          <a href="/login" className="mt-5 inline-block rounded-full bg-gold-500 px-6 py-3 font-body text-xs font-bold uppercase tracking-brand text-forest-950">Sign in →</a>
        </div>
      </main>
    );

  const active = orders
    .filter((o) => ["new", "preparing", "ready"].includes(o.status))
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));

  async function bump(o: Ord) {
    const op = await requireOperator();
    if (!op || !db) return;
    await updateDoc(doc(db, "orders", o.id), {
      status: NEXT[o.status],
      audit: arrayUnion({ text: `status → ${NEXT[o.status]}`, by: op.name, atMs: Date.now() }),
    }).catch(() => {});
  }

  return (
    <main className="min-h-screen bg-forest-950 p-5 text-cream">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl font-bold">ORB<span className="rgb-text">É</span>AN <span className="text-gold-400">KITCHEN</span></p>
        <span className="flex items-center gap-3">
          <button
            onClick={() => connectPrinter().catch(() => {})}
            className="rounded-full border border-cream/20 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500"
          >
            🖨 {printerName() ?? "Connect KOT printer"}
          </button>
          <p className="font-body text-sm text-cream/50">{active.length} tickets</p>
        </span>
      </div>
      <div className="mt-2"><OpsNav /></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {active.length === 0 && <p className="font-body text-cream/45">All clear ☕</p>}
        {active.map((o) => {
          const elapsed = o.createdAt?.toMillis ? now - o.createdAt.toMillis() : 0;
          const mins = Math.floor(elapsed / 60000);
          const alloc = allocMins(o.lines ?? []);
          const d = drain(elapsed, alloc);
          const col = d.color;
          return (
            <button key={o.id} onClick={() => void bump(o)} className={`rounded-lg border bg-forest-850 p-4 text-left transition-colors hover:border-gold-500/50 ${d.overdue ? "animate-pulse border-red-400/60" : "border-cream/10"}`} style={{ borderTop: `4px solid ${col}` }}>
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-bold text-gold-400">{orderCode(o.id)}</span>
                <span className="rounded-full px-2 py-0.5 font-body text-xs font-bold tabular-nums" style={{ backgroundColor: col + "26", color: col }}>
                  ⏱ {mins}m / {alloc}m{d.overdue ? " ⚠" : ""}
                </span>
              </div>
              {/* Papa's-style drain bar: full at order time, empty at the promise */}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-forest-900">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(2, 100 - d.pct)}%`, backgroundColor: col }} />
              </div>
              <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">
                {o.type === "dinein" ? `TABLE ${o.table}` : o.type === "pickup" ? `PICKUP ${o.pickupIn ?? ""}` : "DELIVERY"} · {o.status}
              </p>
              <ul className="mt-2 space-y-1.5">
                {o.lines?.map((l, i) => (
                  <li key={i} className="font-body text-base font-bold leading-snug">
                    {l.qty}× {l.name}
                    <span className="font-normal text-cream/55">{l.size ? ` ${SIZE_LABEL[l.size]}` : ""}{l.temp ? ` · ${l.temp}` : ""}{l.addons?.length ? ` · +${l.addons.map((a) => a.name).join(", ")}` : ""}</span>
                  </li>
                ))}
              </ul>
              {o.notes?.map((n, i) => (
                <p key={i} className="mt-1 rounded bg-gold-500/10 px-2 py-1 font-body text-xs text-gold-400">🗒 {n.text}</p>
              ))}
              <span className="mt-3 flex gap-2">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    void printKOT({ code: orderCode(o.id), lines: o.lines ?? [], table: o.table, type: o.type, notes: o.notes }).catch(() => {});
                  }}
                  className="rounded-full border border-cream/20 px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500"
                >
                  🖨 KOT
                </span>
                {o.status === "ready" && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => void callCustomer(o, e)}
                    className="rounded-full border border-[#3E7C5A] px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-brand text-[#7fcb9b] hover:bg-[#3E7C5A]/20"
                  >
                    📣 Call
                  </span>
                )}
                <span className="flex-1 rounded-full bg-gold-500 px-3 py-1.5 text-center font-body text-[11px] font-bold uppercase tracking-brand text-forest-950">
                  Bump → {NEXT[o.status]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
