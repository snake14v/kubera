"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import OrderEditor, { type EditableOrder } from "@/components/OrderEditor";
import StaffGate, { useStaffGate } from "@/components/StaffGate";
import { type StaffMember } from "@/lib/staff";
import { orderCode, SIZE_LABEL, type SizeKey } from "@/lib/orders";
import { inr } from "@/lib/format";

type Line = {
  name: string;
  size: SizeKey | null;
  temp?: "hot" | "iced" | null;
  addons?: { name: string; price: number }[];
  unitPrice: number;
  qty: number;
};
type Order = {
  id: string;
  type: "dinein" | "pickup" | "delivery";
  lines: Line[];
  subtotal?: number;
  discount?: number;
  coupon?: string | null;
  memberCode?: string | null;
  payment?: { method: "counter" | "upi"; state: "counter" | "pending" | "claimed" | "paid" };
  total: number;
  name: string;
  phone: string;
  table?: string | null;
  pickupIn?: string | null;
  address?: string | null;
  landmark?: string | null;
  distanceKm?: number | null;
  status: "pending" | "new" | "preparing" | "ready" | "done" | "cancelled";
  createdAt?: Timestamp;
};

const NEXT: Record<string, Order["status"]> = { pending: "new", new: "preparing", preparing: "ready", ready: "done" };
const STATUS_COLOR: Record<Order["status"], string> = {
  pending: "#C9A86A",
  new: "#D24B5A",
  preparing: "#E0852F",
  ready: "#3E7C5A",
  done: "#5A4636",
  cancelled: "#5A4636",
};

export default function OrdersAdmin() {
  return <AdminGuard title="Orders">{(user) => <GatedOrders user={user} />}</AdminGuard>;
}

/** Even on the admin console, order actions are signed by a PIN-verified
 *  staff member — the shop account only unlocks the data. */
function GatedOrders({ user }: { user: User }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "staff_members"), (s) =>
      setStaff(
        s.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<StaffMember, "id">) }))
          .filter((m) => m.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
  }, []);
  return (
    <StaffGate staff={staff}>
      <OrdersInner user={user} />
    </StaffGate>
  );
}

function OrdersInner({ user }: { user: User }) {
  const { requireOperator } = useStaffGate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }))),
      () => setErr("Couldn't load orders — check Firestore rules for the orders collection.")
    );
  }, []);

  async function markPaid(id: string) {
    if (!db) return;
    const op = await requireOperator();
    if (!op) return;
    try {
      await updateDoc(doc(db, "orders", id), {
        payment: { method: "upi", state: "paid" },
        audit: arrayUnion({ text: "UPI marked PAID", by: op.name, atMs: Date.now() }),
      });
    } catch {
      setErr("Couldn't mark paid — are you on the admin allow-list in the rules?");
    }
  }

  async function setStatus(id: string, status: Order["status"]) {
    if (!db) return;
    const op = await requireOperator();
    if (!op) return;
    try {
      await updateDoc(doc(db, "orders", id), {
        status,
        audit: arrayUnion({ text: `status → ${status}`, by: op.name, atMs: Date.now() }),
      });
    } catch {
      setErr("Status update failed — are you on the admin allow-list in the rules?");
    }
  }

  const active = orders.filter((o) => !["done", "cancelled"].includes(o.status));
  const past = orders.filter((o) => ["done", "cancelled"].includes(o.status)).slice(0, 20);

  return (
    <div>
      <AdminNav active="orders" />

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-cream">Live orders</h1>
          <p className="mt-1 font-body text-cream/55">{active.length} active · updates in real time</p>
        </div>
      </div>

      {err && <p className="mt-4 font-body text-sm text-red-300">{err}</p>}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {active.length === 0 && (
          <p className="font-body text-cream/45">No active orders. They&rsquo;ll appear here the moment someone hits “Place order”.</p>
        )}
        {active.map((o) => (
          <div key={o.id} className="rounded-sm border border-cream/10 bg-forest-850 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-xl font-bold text-gold-400">{orderCode(o.id)}</span>
                <span className="rounded-full px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-brand" style={{ backgroundColor: STATUS_COLOR[o.status] + "26", color: STATUS_COLOR[o.status] }}>
                  {o.status}
                </span>
              </div>
              <span className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">
                {o.type === "dinein" ? `Table ${o.table}` : o.type === "pickup" ? `Pickup ${o.pickupIn}` : `Delivery · ${o.distanceKm ?? "?"}km`}
              </span>
            </div>

            <ul className="mt-3 space-y-1">
              {o.lines?.map((l, i) => (
                <li key={i} className="flex justify-between font-body text-sm text-cream/80">
                  <span>
                    {l.qty}× {l.name}
                    {l.size ? ` · ${SIZE_LABEL[l.size]}` : ""}
                    {l.temp ? ` · ${l.temp}` : ""}
                    {l.addons?.length ? (
                      <span className="text-gold-400/80"> +{l.addons.map((a) => a.name).join(", ")}</span>
                    ) : null}
                  </span>
                  <span className="tabular-nums text-cream/50">{inr(l.unitPrice * l.qty)}</span>
                </li>
              ))}
            </ul>
            {(o.discount ?? 0) > 0 && (
              <p className="mt-1 font-body text-xs text-[#7fcb9b]">
                Coupon {o.coupon} applied · −{inr(o.discount!)} (subtotal {inr(o.subtotal ?? o.total)})
              </p>
            )}
            {o.memberCode && (
              <p className="mt-1 font-body text-xs text-gold-400/80">Member {o.memberCode} — scan to add beans</p>
            )}
            {o.payment && o.payment.method === "upi" && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-brand ${
                    o.payment.state === "paid"
                      ? "bg-[#3E7C5A]/30 text-[#7fcb9b]"
                      : o.payment.state === "claimed"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {o.payment.state === "paid" ? "UPI PAID ✓" : o.payment.state === "claimed" ? "UPI claimed — verify bank alert" : "UPI unpaid"}
                </span>
                {o.payment.state !== "paid" && db && (
                  <button
                    onClick={() => void markPaid(o.id)}
                    className="rounded-full border border-[#3E7C5A]/60 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-brand text-[#7fcb9b] hover:border-[#7fcb9b]"
                  >
                    Mark PAID ✓
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-cream/10 pt-3">
              <p className="font-body text-xs text-cream/50">
                {o.name} · <a className="text-gold-400" href={`tel:${o.phone}`}>{o.phone}</a>
                {o.type === "delivery" && o.address ? <> · {o.address} {o.landmark}</> : null}
              </p>
              <span className="font-display text-lg font-bold text-cream">{inr(o.total)}</span>
            </div>

            <div className="mt-4 flex gap-2">
              {NEXT[o.status] && (
                <button onClick={() => setStatus(o.id, NEXT[o.status])} className="rounded-full bg-gold-500 px-5 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">
                  Mark {NEXT[o.status]}
                </button>
              )}
              <button onClick={() => setStatus(o.id, "cancelled")} className="rounded-full border border-cream/15 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-cream/50 hover:border-red-400 hover:text-red-300">
                Cancel
              </button>
            </div>
            <OrderEditor
              order={o as unknown as EditableOrder}
              identify={async () => (await requireOperator())?.name ?? null}
              onError={setErr}
            />
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-12 font-display text-xl font-bold text-cream/70">Recent completed</h2>
          <div className="mt-4 overflow-hidden rounded-sm border border-cream/10">
            <table className="w-full text-left font-body text-sm">
              <tbody>
                {past.map((o) => (
                  <tr key={o.id} className="border-t border-cream/10 first:border-0">
                    <td className="px-4 py-2.5 text-gold-400">{orderCode(o.id)}</td>
                    <td className="px-4 py-2.5 text-cream/60">{o.type}</td>
                    <td className="px-4 py-2.5 text-cream/60">{o.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-cream/80">{inr(o.total)}</td>
                    <td className="px-4 py-2.5 text-right text-cream/40">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
