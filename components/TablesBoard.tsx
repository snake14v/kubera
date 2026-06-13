"use client";

// Tables · Floor view — all tables live: who's seated, since when, their
// orders in real time (pending / preparing / ready / served), spend so far,
// and a PIN-signed table-by-table log from seat to leave. Earlier sittings
// of the day stay readable per table. Needs the shop account (orders read
// is admin-only); every action is signed via the StaffGate operator.
//
// Attribution model: each dine-in order belongs to EXACTLY ONE sitting —
// the session whose [openedAtMs, closedAtMs) window contains its createdAt
// (exclusive upper bound: no double counting on re-seat boundaries). Orders
// whose serverTimestamp hasn't resolved yet attach to the open sitting.
// Sessions are queried for today AND yesterday so a sitting opened before
// midnight stays on the board until the guests actually leave.

import { useMemo, useState, useEffect } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db, isAdmin } from "@/lib/firebase";
import { orderCode, SIZE_LABEL, type SizeKey } from "@/lib/orders";
import { useStaffGate } from "@/components/StaffGate";
import { TABLE_COUNT, fmtClock, fmtDur, newTablePin, deadCode, type TableSession } from "@/lib/tables";

type Line = { name: string; size: SizeKey | null; temp?: string | null; unitPrice: number; qty: number };
type Ord = {
  id: string;
  type: "dinein" | "pickup" | "delivery";
  lines: Line[];
  total: number;
  name: string;
  table?: string | null;
  status: "pending" | "new" | "preparing" | "ready" | "done" | "cancelled";
  createdAt?: Timestamp;
  audit?: { text: string; by: string; atMs: number }[];
};

const NEXT: Record<string, Ord["status"]> = { new: "preparing", preparing: "ready", ready: "done" };
const CHIP: Record<string, { label: string; color: string }> = {
  pending: { label: "NEEDS APPROVAL", color: "#C9A86A" },
  new: { label: "QUEUED", color: "#D24B5A" },
  preparing: { label: "PREPARING", color: "#E0852F" },
  ready: { label: "READY", color: "#3E7C5A" },
  done: { label: "SERVED ✓", color: "#8a9b8f" },
};

const inr = (n: number) => "₹" + (n ?? 0).toLocaleString("en-IN");
/** createdAt millis, or null while the serverTimestamp write is in flight */
const ms = (o: Ord): number | null => o.createdAt?.toMillis?.() ?? null;

type ClosedSitting = { s: TableSession; orders: Ord[]; spend: number };
type TableSlot = {
  open: TableSession | null;
  openOrders: Ord[]; // this sitting, cancelled excluded
  closed: ClosedSitting[]; // today's earlier sittings, newest first
  active: Ord[]; // live (new/preparing/ready) orders on this table
  seatFromMs: number | null; // backdate target when starting a sitting from QR orders
};

function prevDateKey(dateKey: string): string {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
}

export default function TablesBoard({ user, dateKey }: { user: User | null; dateKey: string }) {
  const { requireOperator } = useStaffGate();
  const [orders, setOrders] = useState<Ord[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // "Move / transfer" picker: which table's sitting is being moved
  const [moving, setMoving] = useState<{ from: string; session: TableSession; orders: Ord[] } | null>(null);
  const admin = isAdmin(user?.email);

  // elapsed timers tick twice a minute
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!db || !admin) return;
    return onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (s) =>
        setOrders(
          s.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Ord, "id">) }))
            .filter((o) => o.type === "dinein")
        ),
      () => setErr("Couldn't load orders.")
    );
  }, [admin]);

  // today + yesterday: an open sitting must survive the midnight rollover
  useEffect(() => {
    if (!db || !admin) return;
    return onSnapshot(
      query(collection(db, "table_sessions"), where("date", "in", [dateKey, prevDateKey(dateKey)])),
      (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TableSession, "id">) }))),
      () => setErr("Couldn't load the table log.")
    );
  }, [admin, dateKey]);

  const tables = useMemo(() => {
    const map = new Map<string, TableSlot>();
    for (let i = 1; i <= TABLE_COUNT; i++)
      map.set(String(i), { open: null, openOrders: [], closed: [], active: [], seatFromMs: null });

    const closedByTable = new Map<string, TableSession[]>();
    for (const s of sessions) {
      const slot = map.get(s.table);
      if (!slot) continue;
      if (!s.closedAtMs) {
        // keep the earliest still-open sitting if duplicates ever appear
        if (!slot.open || s.openedAtMs < slot.open.openedAtMs) slot.open = s;
      } else if (s.date === dateKey) {
        const arr = closedByTable.get(s.table) ?? [];
        arr.push(s);
        closedByTable.set(s.table, arr);
      }
    }
    closedByTable.forEach((arr) => arr.sort((a, b) => a.openedAtMs - b.openedAtMs));

    for (const [num, slot] of map) {
      const tOrders = orders.filter((o) => String(o.table ?? "") === num);
      slot.active = tOrders.filter((o) => ["pending", "new", "preparing", "ready"].includes(o.status));

      const closedList = closedByTable.get(num) ?? [];
      const buckets: ClosedSitting[] = closedList.map((s) => ({ s, orders: [], spend: 0 }));
      const claimed = new Set<string>();

      for (const o of tOrders) {
        if (o.status === "cancelled") continue;
        const t = ms(o);
        if (t === null) {
          // write still in flight — it was just placed, so it belongs to the
          // open sitting (never to a finished one)
          if (slot.open) {
            slot.openOrders.push(o);
            claimed.add(o.id);
          }
          continue;
        }
        // exclusive upper bound: an order can match at most one window
        const bucket = buckets.find((b) => t >= b.s.openedAtMs && t < (b.s.closedAtMs as number));
        if (bucket) {
          bucket.orders.push(o);
          bucket.spend += o.total ?? 0;
          claimed.add(o.id);
        } else if (slot.open && t >= slot.open.openedAtMs) {
          slot.openOrders.push(o);
          claimed.add(o.id);
        }
      }

      // backdate target for "start sitting from QR order": the earliest order
      // (any non-cancelled status, incl. already-served) nobody has claimed yet
      const unclaimed = tOrders
        .map((o) => (o.status !== "cancelled" && !claimed.has(o.id) ? ms(o) : null))
        .filter((t): t is number => t !== null);
      slot.seatFromMs = unclaimed.length ? Math.min(...unclaimed) : null;

      buckets.sort((a, b) => b.s.openedAtMs - a.s.openedAtMs);
      slot.closed = buckets;
    }
    return map;
  }, [orders, sessions, dateKey]);

  /** one mutation at a time, PIN first, error surfaced */
  async function guarded(key: string, fn: (opName: string) => Promise<void>) {
    if (busyKey || !db) return;
    setBusyKey(key);
    try {
      const op = await requireOperator();
      if (!op) return;
      await fn(op.name);
    } catch {
      setErr("Write failed — is this tablet on the shop account?");
    } finally {
      setBusyKey(null);
    }
  }

  const seat = (table: string, fromMs: number | null) =>
    guarded(`seat-${table}`, async (by) => {
      // issue this sitting's table PIN; the matching code in table_codes/{n}
      // is what Firestore rules check on dine-in orders (rotates each sitting)
      const pin = newTablePin();
      const batch = writeBatch(db!);
      batch.set(doc(collection(db!, "table_sessions")), {
        table,
        date: dateKey,
        openedAtMs: fromMs ?? Date.now(),
        openedBy: by,
        guests: null,
        closedAtMs: null,
        closedBy: null,
        tablePin: pin,
        log: [
          { text: fromMs ? "sitting opened from a QR order" : "guests seated", by, atMs: Date.now() },
          { text: `table PIN issued · ${pin}`, by, atMs: Date.now() },
        ],
      });
      batch.set(doc(db!, "table_codes", table), { code: pin });
      await batch.commit();
    });

  const reissuePin = (s: TableSession) =>
    guarded(`pin-${s.id}`, async (by) => {
      const pin = newTablePin();
      const batch = writeBatch(db!);
      batch.update(doc(db!, "table_sessions", s.id), {
        tablePin: pin,
        log: arrayUnion({ text: `table PIN reissued · ${pin}`, by, atMs: Date.now() }),
      });
      batch.set(doc(db!, "table_codes", s.table), { code: pin });
      await batch.commit();
    });

  const closeTable = (s: TableSession, spend: number) => {
    void guarded(`close-${s.id}`, async (by) => {
      // park a dead code so the freed table's PIN no longer validates
      const batch = writeBatch(db!);
      batch.update(doc(db!, "table_sessions", s.id), {
        closedAtMs: Date.now(),
        closedBy: by,
        log: arrayUnion({
          text: `table closed — ${fmtDur(Date.now() - s.openedAtMs)} · ${inr(spend)}`,
          by,
          atMs: Date.now(),
        }),
      });
      batch.set(doc(db!, "table_codes", s.table), { code: deadCode() });
      await batch.commit();
    });
  };

  const setGuests = (s: TableSession, delta: number) =>
    guarded(`guests-${s.id}`, async () => {
      await updateDoc(doc(db!, "table_sessions", s.id), {
        guests: Math.max(1, (s.guests ?? 0) + delta),
      });
    });

  const addLog = (s: TableSession, text: string) =>
    guarded(`log-${s.id}`, async (by) => {
      await updateDoc(doc(db!, "table_sessions", s.id), {
        log: arrayUnion({ text: text.trim(), by, atMs: Date.now() }),
      });
    });

  /** Move a sitting (orders + bill) to another table. FREE destination =
   *  the whole sitting rides along. OCCUPIED destination = bill MERGE: the
   *  destination's open sitting absorbs the orders (window extended so
   *  attribution holds), guests are summed, and the source sitting closes
   *  with a "transferred" stamp. One atomic batch. */
  const transfer = (dest: string) => {
    const mv = moving;
    if (!mv || dest === mv.from || !db) return;
    const destOpen = tables.get(dest)?.open ?? null;
    setMoving(null);
    void guarded(`move-${mv.session.id}`, async (by) => {
      const atMs = Date.now();
      const spend = mv.orders.reduce((s, o) => s + (o.total ?? 0), 0);
      const batch = writeBatch(db!);
      for (const o of mv.orders) {
        batch.update(doc(db!, "orders", o.id), {
          table: dest,
          audit: arrayUnion({ text: `table T${mv.from} → T${dest}`, by, atMs }),
        });
      }
      if (destOpen) {
        batch.update(doc(db!, "table_sessions", destOpen.id), {
          openedAtMs: Math.min(destOpen.openedAtMs, mv.session.openedAtMs),
          guests:
            destOpen.guests || mv.session.guests
              ? (destOpen.guests ?? 0) + (mv.session.guests ?? 0)
              : null,
          log: arrayUnion({
            text: `T${mv.from}'s bill merged in — ${mv.orders.length} order${mv.orders.length === 1 ? "" : "s"} · ${inr(spend)}`,
            by,
            atMs,
          }),
        });
        batch.update(doc(db!, "table_sessions", mv.session.id), {
          closedAtMs: atMs,
          closedBy: by,
          log: arrayUnion({ text: `bill transferred to T${dest}`, by, atMs }),
        });
        // merge: source table freed → its PIN dies (dest keeps its own)
        batch.set(doc(db!, "table_codes", mv.from), { code: deadCode() });
      } else {
        batch.update(doc(db!, "table_sessions", mv.session.id), {
          table: dest,
          log: arrayUnion({ text: `table moved T${mv.from} → T${dest}`, by, atMs }),
        });
        // move: the sitting's PIN now belongs to the new table; old table dies
        batch.set(doc(db!, "table_codes", dest), { code: mv.session.tablePin ?? newTablePin() });
        batch.set(doc(db!, "table_codes", mv.from), { code: deadCode() });
      }
      await batch.commit();
    });
  };

  const approve = (o: Ord) =>
    guarded(`appr-${o.id}`, async (by) => {
      await updateDoc(doc(db!, "orders", o.id), {
        status: "new",
        audit: arrayUnion({ text: "APPROVED → sent to kitchen", by, atMs: Date.now() }),
      });
    });

  const advance = (o: Ord) =>
    guarded(`adv-${o.id}`, async (by) => {
      if (!NEXT[o.status]) return;
      await updateDoc(doc(db!, "orders", o.id), {
        status: NEXT[o.status],
        audit: arrayUnion({ text: `status → ${NEXT[o.status]}`, by, atMs: Date.now() }),
      });
    });

  if (!admin) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-gold-500/30 bg-forest-900 p-8 text-center">
        <p className="font-display text-xl font-bold">Shop account needed</p>
        <p className="mt-2 font-body text-sm text-cream/60">
          The floor view reads real orders — sign this tablet in once with the shop&apos;s Google account.
        </p>
        <a
          href="/login"
          className="mt-5 inline-block rounded-full bg-gold-500 px-6 py-3 font-body text-[12px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700"
        >
          Sign in →
        </a>
      </div>
    );
  }

  const slots = [...tables.values()];
  const seated = slots.filter((t) => t.open).length;
  const waiting = slots.filter((t) => !t.open && t.active.length > 0).length;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">
        Tables{" "}
        <span className="text-cream/40">
          {seated}/{TABLE_COUNT} seated{waiting > 0 ? ` · ${waiting} QR waiting` : ""}
        </span>
      </h2>
      {err && <p className="mt-3 font-body text-sm text-red-300">{err}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...tables.entries()].map(([num, t]) => (
          <TableCard
            key={num}
            num={num}
            t={t}
            now={now}
            busy={!!busyKey}
            onSeat={seat}
            onClose={closeTable}
            onGuests={setGuests}
            onLog={addLog}
            onAdvance={advance}
            onMove={(session, orders) => setMoving({ from: num, session, orders })}
            onReissue={reissuePin}
            onApprove={approve}
          />
        ))}
      </div>

      {/* destination picker */}
      {moving && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Move table"
        >
          <div className="w-full max-w-md rounded-lg border border-gold-500/30 bg-forest-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold text-cream">Move T{moving.from} → where?</p>
                <p className="mt-1 font-body text-xs text-cream/50">
                  Free table = guests &amp; bill move. Occupied = bills merge into that sitting.
                </p>
              </div>
              <button
                onClick={() => setMoving(null)}
                className="rounded-full border border-cream/20 px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[...tables.entries()]
                .filter(([n]) => n !== moving.from)
                .map(([n, slot]) => {
                  const occ = !!slot.open;
                  return (
                    <button
                      key={n}
                      onClick={() => transfer(n)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        occ
                          ? "border-[#E0852F]/40 hover:border-[#E0852F]"
                          : "border-cream/10 bg-forest-850 hover:border-gold-500/60"
                      }`}
                    >
                      <p className="font-display text-base font-bold text-cream">T{n}</p>
                      <p className={`font-body text-[10px] font-bold uppercase tracking-brand ${occ ? "text-[#E0852F]" : "text-[#9fb3a5]"}`}>
                        {occ ? "merge bill" : "free — move here"}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── one table ── */

function StatusChip({ status }: { status: string }) {
  const chip = CHIP[status];
  if (!chip) return null;
  return (
    <span
      className="rounded-full px-2 py-0.5 font-body text-[9px] font-bold uppercase tracking-brand"
      style={{ backgroundColor: chip.color + "26", color: chip.color }}
    >
      {chip.label}
    </span>
  );
}

function TableCard({
  num,
  t,
  now,
  busy,
  onSeat,
  onClose,
  onGuests,
  onLog,
  onAdvance,
  onMove,
  onReissue,
  onApprove,
}: {
  num: string;
  t: TableSlot;
  now: number;
  busy: boolean;
  onSeat: (table: string, fromMs: number | null) => void;
  onClose: (s: TableSession, spend: number) => void;
  onGuests: (s: TableSession, delta: number) => void;
  onLog: (s: TableSession, text: string) => void;
  onAdvance: (o: Ord) => void;
  onMove: (s: TableSession, orders: Ord[]) => void;
  onReissue: (s: TableSession) => void;
  onApprove: (o: Ord) => void;
}) {
  const [showLog, setShowLog] = useState(false);
  const [note, setNote] = useState("");
  // two-tap close when orders are unserved — no native confirm() (it blocks
  // the tab and looks wrong on tablets); auto-disarms after 4s
  const [armClose, setArmClose] = useState(false);
  useEffect(() => {
    if (!armClose) return;
    const t = setTimeout(() => setArmClose(false), 4000);
    return () => clearTimeout(t);
  }, [armClose]);

  const open = t.open;
  const sitting = t.openOrders;
  const spend = sitting.reduce((s, o) => s + (o.total ?? 0), 0);
  const served = sitting.filter((o) => o.status === "done").length;
  const pendingOrders = sitting.filter((o) => ["pending", "new", "preparing", "ready"].includes(o.status));
  const unlogged = !open && t.active.length > 0;
  const todaySpendClosed = t.closed.reduce((s, c) => s + c.spend, 0);

  const state = open
    ? { label: `OCCUPIED · ${fmtDur(now - open.openedAtMs)}`, color: "#B59556" }
    : unlogged
      ? { label: "QR ORDER — START SITTING", color: "#E0852F" }
      : { label: "FREE", color: "#5A6B5E" };

  return (
    <div
      className="flex flex-col rounded-lg border border-cream/10 bg-forest-850 p-4"
      style={{ borderTop: `3px solid ${state.color}` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-xl font-bold text-cream">T{num}</span>
        <span
          className="rounded-full px-2.5 py-1 font-body text-[9px] font-bold uppercase tracking-brand"
          style={{ backgroundColor: state.color + "26", color: state.color === "#5A6B5E" ? "#9fb3a5" : state.color }}
        >
          {state.label}
        </span>
      </div>

      {/* occupied: guests + spend + live orders */}
      {open && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-body text-xs text-cream/60">
            <span className="flex items-center gap-0.5 rounded-full bg-forest-900 px-2 py-1">
              👥
              <button
                disabled={busy}
                onClick={() => onGuests(open, -1)}
                className="px-2 py-0.5 text-base leading-none text-cream/50 hover:text-red-300 disabled:opacity-40"
                aria-label="Fewer guests"
              >
                −
              </button>
              <span className="font-bold text-cream">{open.guests ?? "?"}</span>
              <button
                disabled={busy}
                onClick={() => onGuests(open, +1)}
                className="px-2 py-0.5 text-base leading-none text-cream/50 hover:text-gold-400 disabled:opacity-40"
                aria-label="More guests"
              >
                +
              </button>
            </span>
            <span className="rounded-full bg-gold-500/15 px-2 py-0.5 font-bold text-gold-400">{inr(spend)}</span>
            <span className="text-cream/40">
              {pendingOrders.length > 0 ? `${pendingOrders.length} pending · ` : ""}
              {served} served
            </span>
          </div>
          <p className="mt-1 font-body text-[10px] text-cream/35">
            seated {fmtClock(open.openedAtMs)} by {open.openedBy}
          </p>
          {/* the PIN the guest types to order to this table — give it to them */}
          <div className="mt-2 flex items-center gap-2 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2">
            <span className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">Table PIN</span>
            <span className="font-display text-xl font-bold tracking-[0.2em] text-gold-400">{open.tablePin ?? "————"}</span>
            <button
              disabled={busy}
              onClick={() => onReissue(open)}
              className="ml-auto rounded-full border border-cream/20 px-2.5 py-1 font-body text-[9px] font-bold uppercase tracking-brand text-cream/55 hover:border-gold-500 disabled:opacity-40"
            >
              ↻ New
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {sitting.length === 0 && <p className="font-body text-xs text-cream/35">No orders yet this sitting.</p>}
            {sitting.map((o) => (
              <div key={o.id} className="rounded-md bg-forest-900/70 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-[11px] font-bold text-gold-400">{orderCode(o.id)}</span>
                  <span className="flex items-center gap-1.5">
                    <StatusChip status={o.status} />
                    {o.status === "pending" ? (
                      <button
                        disabled={busy}
                        onClick={() => onApprove(o)}
                        className="rounded-full bg-[#3E7C5A] px-2.5 py-1 font-body text-[9px] font-bold uppercase tracking-brand text-cream hover:bg-[#4e9c72] disabled:opacity-40"
                      >
                        ✓ approve
                      </button>
                    ) : NEXT[o.status] ? (
                      <button
                        disabled={busy}
                        onClick={() => onAdvance(o)}
                        className="rounded-full bg-gold-500 px-2.5 py-1 font-body text-[9px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-40"
                      >
                        → {NEXT[o.status] === "done" ? "served" : NEXT[o.status]}
                      </button>
                    ) : null}
                  </span>
                </div>
                <p className="mt-0.5 break-words font-body text-[11px] text-cream/65">
                  {o.lines?.map((l) => `${l.qty}× ${l.name}${l.size ? ` ${SIZE_LABEL[l.size]}` : ""}`).join(", ")}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => onMove(open, sitting)}
              className="rounded-full border border-gold-500/40 px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-gold-400 hover:bg-gold-500/10 disabled:opacity-40"
            >
              ⇄ Move / transfer
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (pendingOrders.length > 0 && !armClose) {
                  setArmClose(true);
                  return;
                }
                setArmClose(false);
                onClose(open, spend);
              }}
              className={`rounded-full border px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand disabled:opacity-40 ${
                armClose
                  ? "border-red-400 bg-red-500/15 text-red-300"
                  : "border-cream/15 text-cream/55 hover:border-red-400 hover:text-red-300"
              }`}
            >
              {armClose ? `${pendingOrders.length} unserved — tap again to close` : "Guests left — close"}
            </button>
          </div>
        </>
      )}

      {/* QR order arrived on a free table */}
      {unlogged && (
        <>
          <div className="mt-2 space-y-1.5">
            {t.active.map((o) => (
              <div key={o.id} className="rounded-md bg-forest-900/70 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-[11px] font-bold text-gold-400">{orderCode(o.id)}</span>
                  <StatusChip status={o.status} />
                </div>
                <p className="mt-0.5 break-words font-body text-[11px] text-cream/65">
                  {o.lines?.map((l) => `${l.qty}× ${l.name}`).join(", ")} · {inr(o.total)}
                </p>
              </div>
            ))}
          </div>
          <button
            disabled={busy}
            onClick={() => onSeat(num, t.seatFromMs)}
            className="mt-3 rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-40"
          >
            Start sitting log
          </button>
        </>
      )}

      {/* free */}
      {!open && !unlogged && (
        <button
          disabled={busy}
          onClick={() => onSeat(num, null)}
          className="mt-3 rounded-full border border-gold-500/40 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 hover:bg-gold-500/10 disabled:opacity-40"
        >
          Seat guests +
        </button>
      )}

      {/* table-by-table log */}
      <button
        onClick={() => setShowLog((v) => !v)}
        aria-expanded={showLog}
        className="mt-3 border-t border-cream/10 pt-2 text-left font-body text-[10px] font-bold uppercase tracking-brand text-cream/40 hover:text-gold-400"
      >
        Table log {showLog ? "▴" : "▾"}
        {t.closed.length > 0
          ? ` · ${t.closed.length} earlier sitting${t.closed.length === 1 ? "" : "s"} · ${inr(todaySpendClosed)}`
          : ""}
      </button>

      {showLog && (
        <div className="mt-2 space-y-2">
          {open && (
            <div className="rounded-md bg-forest-900/50 p-2.5">
              <p className="font-body text-[10px] font-bold uppercase tracking-brand text-gold-400/80">
                Current sitting
              </p>
              <SittingTimeline session={open} orders={sitting} />
              <div className="mt-1.5 flex gap-1.5">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && note.trim()) {
                      onLog(open, note);
                      setNote("");
                    }
                  }}
                  placeholder="Log (water served, cake at 8…)"
                  className="min-w-0 flex-1 rounded-full border border-cream/15 bg-forest-900 px-3 py-1.5 font-body text-[11px] text-cream outline-none placeholder:text-cream/35 focus:border-gold-500"
                />
                <button
                  disabled={busy || !note.trim()}
                  onClick={() => {
                    onLog(open, note);
                    setNote("");
                  }}
                  className="rounded-full bg-gold-500 px-3.5 py-1.5 font-body text-[9px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-40"
                >
                  Log +
                </button>
              </div>
            </div>
          )}
          {t.closed.map((c) => (
            <div key={c.s.id} className="rounded-md bg-forest-900/40 p-2.5">
              <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">
                {fmtClock(c.s.openedAtMs)}–{c.s.closedAtMs ? fmtClock(c.s.closedAtMs) : "?"} ·{" "}
                {fmtDur((c.s.closedAtMs ?? c.s.openedAtMs) - c.s.openedAtMs)}
                {c.s.guests ? ` · 👥 ${c.s.guests}` : ""} · {inr(c.spend)}
              </p>
              <SittingTimeline session={c.s} orders={c.orders} dim />
            </div>
          ))}
          {!open && t.closed.length === 0 && (
            <p className="font-body text-[11px] text-cream/35">No sittings logged today.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Merged seat-to-leave timeline: log entries + order placements + their
 *  signed status changes, in time order. */
function SittingTimeline({ session, orders, dim = false }: { session: TableSession; orders: Ord[]; dim?: boolean }) {
  const events: { atMs: number; text: string; by?: string }[] = [
    ...(session.log ?? []).map((e) => ({ atMs: e.atMs, text: e.text, by: e.by })),
    ...orders.flatMap((o) => [
      { atMs: ms(o) ?? Date.now(), text: `order ${orderCode(o.id)} placed · ${inr(o.total)} — ${o.name}` },
      ...(o.audit ?? []).map((a) => ({ atMs: a.atMs, text: `${orderCode(o.id)} ${a.text}`, by: a.by })),
    ]),
  ].sort((a, b) => a.atMs - b.atMs);

  return (
    <>
      {events.map((e, i) => (
        <p key={i} className={`mt-0.5 font-body text-[11px] ${dim ? "text-cream/50" : "text-cream/60"}`}>
          {fmtClock(e.atMs)} — {e.text}
          {e.by ? <span className={dim ? "text-cream/30" : "text-cream/35"}> · {e.by}</span> : null}
        </p>
      ))}
    </>
  );
}
