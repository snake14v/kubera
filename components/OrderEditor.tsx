"use client";

// In-place order editing for the live boards (staff portal + admin):
// line qty +/- and remove, append-only staff notes with author stamps.
// Totals recompute live (discount preserved). EVERY edit is identified —
// `identify()` resolves the acting person's name (staff PIN gate on the
// portal, "Admin" on the owner console) or null to abort. Qty changes are
// stamped into an append-only `audit` trail on the order doc.
// Requires shop-account auth (Firestore rules: order updates are admin-only).

import { useRef, useState } from "react";
import { addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { inr } from "@/lib/format";

type EditLine = {
  name: string;
  size?: string | null;
  temp?: string | null;
  addons?: { name: string; price: number }[];
  unitPrice: number;
  qty: number;
};

export type AuditEntry = { text: string; by: string; atMs: number };

export type EditableOrder = {
  id: string;
  lines: EditLine[];
  discount?: number;
  subtotal?: number;
  total: number;
  notes?: AuditEntry[];
  audit?: AuditEntry[];
  // pass-through fields used by duplicate / refund (boards cast full orders in)
  type?: string;
  name?: string;
  phone?: string;
  table?: string | null;
  pickupIn?: string | null;
  status?: string;
  payment?: { method: string; state: string };
  refund?: { amount: number; by: string; atMs: number };
  comp?: { amount: number; reason: string; by: string; atMs: number };
};

/** Why a bill went on the house — feeds the owner's exceptions board. */
const COMP_REASONS = ["Guest recovery", "Quality issue", "Staff drink", "Influencer / PR", "Owner treat"];

export default function OrderEditor({
  order,
  identify,
  onError,
}: {
  order: EditableOrder;
  /** Resolve who is acting (PIN gate / "Admin"), or null to cancel the action. */
  identify: () => Promise<string | null>;
  onError?: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function bumpQty(i: number, delta: number) {
    const target = order.lines[i];
    if (!target || !db || busy) return;
    const lines = order.lines
      .map((l, j) => (j === i ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0);
    if (lines.length === 0) {
      onError?.("Last item — cancel the order instead.");
      return;
    }
    // busy BEFORE identify() — blocks double-taps while the PIN modal is up
    setBusy(true);
    const by = await identify();
    if (!by) {
      setBusy(false);
      return;
    }
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const discount = order.discount ?? 0;
    const newQty = target.qty + delta;
    try {
      await updateDoc(doc(db, "orders", order.id), {
        lines,
        subtotal,
        total: Math.max(0, subtotal - discount),
        audit: arrayUnion({
          text: newQty <= 0 ? `removed ${target.name}` : `${target.name} qty ${target.qty} → ${newQty}`,
          by,
          atMs: Date.now(),
        }),
      });
    } catch {
      onError?.("Edit failed — is this tablet on the shop account?");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!db || !note.trim() || busy) return;
    setBusy(true);
    const by = await identify();
    if (!by) {
      setBusy(false);
      return;
    }
    try {
      await updateDoc(doc(db, "orders", order.id), {
        notes: arrayUnion({ text: note.trim(), by, atMs: Date.now() }),
      });
      setNote("");
    } catch {
      onError?.("Note failed — is this tablet on the shop account?");
    } finally {
      setBusy(false);
    }
  }

  const audit = order.audit ?? [];
  // money actions are allowed but ARMED (two-tap) + PIN-signed + audit-logged
  const [arm, setArm] = useState<"" | "refund" | "cancel" | "comp">("");
  const [compReason, setCompReason] = useState(COMP_REASONS[0]);
  // one disarm timer — re-arming must not inherit the previous arm's countdown
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function moneyAction(kind: "refund" | "cancel" | "dup" | "comp") {
    if (!db || busy) return;
    if ((kind === "refund" || kind === "cancel" || kind === "comp") && arm !== kind) {
      setArm(kind);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArm(""), 4000);
      return;
    }
    setArm("");
    setBusy(true);
    const by = await identify();
    if (!by) {
      setBusy(false);
      return;
    }
    try {
      if (kind === "cancel") {
        await updateDoc(doc(db, "orders", order.id), {
          status: "cancelled",
          audit: arrayUnion({ text: `ORDER CANCELLED (was ${inr(order.total)})`, by, atMs: Date.now() }),
        });
      } else if (kind === "refund") {
        await updateDoc(doc(db, "orders", order.id), {
          payment: { method: order.payment?.method ?? "counter", state: "refunded" },
          refund: { amount: order.total, by, atMs: Date.now() },
          audit: arrayUnion({ text: `REFUNDED ${inr(order.total)}`, by, atMs: Date.now() }),
        });
      } else if (kind === "comp") {
        // tracking, not money movement: the bill stays on the books, the
        // comp field flags it on-the-house for the exceptions board
        await updateDoc(doc(db, "orders", order.id), {
          comp: { amount: order.total, reason: compReason, by, atMs: Date.now() },
          audit: arrayUnion({ text: `COMP ${inr(order.total)} — ${compReason}`, by, atMs: Date.now() }),
        });
      } else {
        const ref = await addDoc(collection(db, "orders"), {
          type: order.type ?? "pickup",
          table: order.table ?? null,
          pickupIn: order.pickupIn ?? "ASAP",
          lines: order.lines,
          subtotal: order.subtotal ?? order.total,
          discount: order.discount ?? 0,
          coupon: null,
          total: order.total,
          name: order.name ?? "Counter",
          phone: order.phone ?? "counter",
          uid: null,
          email: null,
          memberCode: null,
          status: "new",
          pos: "duplicate",
          payment: { method: "counter", state: "counter" },
          audit: [{ text: `duplicated from this order's twin by ${by}`, by, atMs: Date.now() }],
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "orders", order.id), {
          audit: arrayUnion({ text: `duplicated → new order ${ref.id.slice(0, 4).toUpperCase()}`, by, atMs: Date.now() }),
        });
      }
    } catch {
      onError?.("Action failed — is this tablet on the shop account?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-cream/10 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45 transition-colors hover:text-gold-400"
      >
        ✎ Edit order {open ? "▴" : "▾"}{order.notes?.length ? ` · ${order.notes.length} note${order.notes.length === 1 ? "" : "s"}` : ""}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {order.lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-forest-900/70 px-3 py-2">
              <span className="min-w-0 truncate font-body text-xs text-cream/75">
                {l.name}
                {l.size ? ` · ${String(l.size).toUpperCase()}` : ""}
                {l.temp ? ` · ${l.temp}` : ""} · {inr(l.unitPrice)}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  disabled={busy}
                  onClick={() => void bumpQty(i, -1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 text-cream/70 hover:border-cRose hover:text-red-300"
                  aria-label={`Reduce ${l.name}`}
                >
                  −
                </button>
                <span className="w-5 text-center font-body text-xs font-bold tabular-nums text-cream">{l.qty}</span>
                <button
                  disabled={busy}
                  onClick={() => void bumpQty(i, +1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 text-cream/70 hover:border-gold-500 hover:text-gold-400"
                  aria-label={`Increase ${l.name}`}
                >
                  +
                </button>
              </span>
            </div>
          ))}

          {/* notes */}
          {(order.notes ?? []).map((n, i) => (
            <p key={i} className="rounded-md bg-gold-500/10 px-3 py-1.5 font-body text-xs text-gold-400/90">
              🗒 {n.text} <span className="text-cream/35">— {n.by}, {new Date(n.atMs).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </p>
          ))}
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              placeholder="Add note (no sugar, table moved, allergy…)"
              className="flex-1 rounded-full border border-cream/15 bg-forest-900 px-4 py-2 font-body text-xs text-cream outline-none placeholder:text-cream/35 focus:border-gold-500"
            />
            <button disabled={busy || !note.trim()} onClick={addNote} className="rounded-full bg-gold-500 px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-40">
              Note +
            </button>
          </div>

          {/* money actions — allowed, two-tap armed, PIN-signed, always logged */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              disabled={busy}
              onClick={() => void moneyAction("dup")}
              className="min-h-[40px] rounded-full border border-cream/15 px-4 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500 hover:text-gold-400 disabled:opacity-40"
            >
              ⧉ Duplicate
            </button>
            <button
              disabled={busy || order.payment?.state === "refunded" || !!order.comp}
              onClick={() => void moneyAction("refund")}
              className={`min-h-[40px] rounded-full border px-4 font-body text-[10px] font-bold uppercase tracking-brand disabled:opacity-40 ${
                arm === "refund" ? "border-amber-300 bg-amber-300/15 text-amber-300" : "border-cream/15 text-cream/60 hover:border-amber-300 hover:text-amber-300"
              }`}
            >
              {order.payment?.state === "refunded" ? "↩ Refunded ✓" : arm === "refund" ? `Tap again — refund ${inr(order.total)}` : `↩ Refund ${inr(order.total)}`}
            </button>
            {order.status !== "cancelled" && (
              <button
                disabled={busy}
                onClick={() => void moneyAction("cancel")}
                className={`min-h-[40px] rounded-full border px-4 font-body text-[10px] font-bold uppercase tracking-brand disabled:opacity-40 ${
                  arm === "cancel" ? "border-red-400 bg-red-500/15 text-red-300" : "border-cream/15 text-cream/60 hover:border-red-400 hover:text-red-300"
                }`}
              >
                {arm === "cancel" ? "Tap again — cancel order" : "✕ Cancel"}
              </button>
            )}
          </div>

          {/* comp — on the house, reason required, tracked on the exceptions
              board. A refunded or cancelled bill can't ALSO go on the house —
              that would double-book the same loss. */}
          {order.comp ? (
            <p className="pt-1 font-body text-[11px] font-bold text-[#b3a1dd]">🎁 On the house — {order.comp.reason} ({order.comp.by})</p>
          ) : order.payment?.state !== "refunded" && order.status !== "cancelled" ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={compReason}
                onChange={(e) => setCompReason(e.target.value)}
                className="rounded-full border border-cream/15 bg-forest-900 px-3 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-cream/70 outline-none focus:border-gold-500"
                aria-label="Comp reason"
              >
                {COMP_REASONS.map((r) => <option key={r} className="bg-forest-900">{r}</option>)}
              </select>
              <button
                disabled={busy}
                onClick={() => void moneyAction("comp")}
                className={`min-h-[40px] rounded-full border px-4 font-body text-[10px] font-bold uppercase tracking-brand disabled:opacity-40 ${
                  arm === "comp" ? "border-[#8D76C0] bg-[#8D76C0]/15 text-[#b3a1dd]" : "border-cream/15 text-cream/60 hover:border-[#8D76C0] hover:text-[#b3a1dd]"
                }`}
              >
                {arm === "comp" ? `Tap again — comp ${inr(order.total)} (${compReason})` : `🎁 Comp ${inr(order.total)}`}
              </button>
            </div>
          ) : null}

          {/* signed action history */}
          {audit.length > 0 && (
            <div className="rounded-md bg-forest-900/50 px-3 py-2">
              <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/35">History</p>
              {audit.slice(-4).map((a, i) => (
                <p key={i} className="mt-0.5 font-body text-[11px] text-cream/50">
                  {a.text} <span className="text-cream/30">— {a.by}, {new Date(a.atMs).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
