"use client";

// Orbéan admin manager — Cha Angadi-style tabbed panel (minus the AI chatbot):
// Menu CRUD · Offers · Coupons · Customers · Feedback · Settings.

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { CATEGORIES } from "@/lib/orders";

const field =
  "w-full rounded-full border border-cream/15 bg-forest-850/80 px-4 py-2.5 font-body text-sm text-cream outline-none transition-colors placeholder:text-cream/40 focus:border-gold-500";
const btnGold =
  "rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-50";
const btnGhost =
  "rounded-full border border-cream/20 px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500 hover:text-gold-400";
const btnDanger =
  "rounded-full border border-cream/20 px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-red-400 hover:text-red-300";

type Tab = "menu" | "offers" | "coupons" | "customers" | "staff" | "feedback" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "menu", label: "Menu" },
  { id: "offers", label: "Offers" },
  { id: "coupons", label: "Coupons" },
  { id: "customers", label: "Customers" },
  { id: "staff", label: "Staff" },
  { id: "feedback", label: "Feedback" },
  { id: "settings", label: "Settings" },
];

export default function ManagePage() {
  return <AdminGuard title="Manage">{(user) => <Inner user={user} />}</AdminGuard>;
}

function Inner({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("menu");
  return (
    <div>
      <AdminNav active="manage" />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-5 py-2 font-body text-[11px] font-bold uppercase tracking-brand transition-colors ${
              tab === t.id ? "bg-gold-500/15 text-gold-400" : "border border-cream/15 text-cream/55 hover:border-gold-500/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "menu" && <MenuTab />}
        {tab === "offers" && <OffersTab />}
        {tab === "coupons" && <CouponsTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "staff" && <StaffTab />}
        {tab === "feedback" && <FeedbackTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

/* ── Menu CRUD (custom items + price/availability overrides live on /order) ── */

type MenuDoc = {
  id: string;
  name: string;
  category: string;
  price: number;
  note?: string;
  available: boolean;
  custom: boolean;
};

function MenuTab() {
  const [items, setItems] = useState<MenuDoc[]>([]);
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0] as string, price: "", note: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "menu_admin"), (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MenuDoc, "id">) })))
    );
  }, []);

  async function save() {
    if (!db) return;
    const price = Number(form.price);
    if (!form.name.trim()) return setMsg("Item name is required.");
    if (!price || price < 0) return setMsg("Enter a valid price.");
    const id = editing ?? `custom-${Date.now()}`;
    await setDoc(doc(db, "menu_admin", id), {
      name: form.name.trim(),
      category: form.category,
      price,
      note: form.note.trim(),
      available: true,
      custom: true,
      updatedAt: serverTimestamp(),
    });
    setForm({ name: "", category: CATEGORIES[0], price: "", note: "" });
    setEditing(null);
    setMsg(editing ? "Item updated." : "Item added — live on /order now.");
  }

  async function toggle(it: MenuDoc) {
    if (!db) return;
    await setDoc(doc(db, "menu_admin", it.id), { ...it, available: !it.available, updatedAt: serverTimestamp() });
  }

  async function remove(id: string) {
    if (!db) return;
    await deleteDoc(doc(db, "menu_admin", id));
    setMsg("Item deleted.");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="h-fit rounded-sm border border-cream/10 bg-forest-850 p-6">
        <h3 className="font-display text-lg font-bold text-cream">{editing ? "Edit item" : "New menu item"}</h3>
        <div className="mt-4 space-y-3">
          <input className={field} placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-forest-900">{c}</option>
            ))}
          </select>
          <input className={field} placeholder="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className={field} placeholder="Short description" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={save} className={btnGold}>{editing ? "Update" : "Add item"}</button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm({ name: "", category: CATEGORIES[0], price: "", note: "" }); }} className={btnGhost}>
                Cancel
              </button>
            )}
          </div>
          {msg && <p className="font-body text-xs text-[#7fcb9b]">{msg}</p>}
          <p className="font-body text-xs text-cream/40">
            Items added here appear on /order instantly. The built-in menu lives in code — add overrides here to extend or 86 items.
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-cream">Custom items ({items.length})</h3>
        <div className="mt-4 space-y-2">
          {items.length === 0 && <p className="font-body text-sm text-cream/45">Nothing custom yet.</p>}
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 rounded-sm border border-cream/10 bg-forest-850 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-body text-sm font-bold text-cream">
                  {it.name} <span className="font-normal text-gold-400">₹{it.price}</span>
                </p>
                <p className="font-body text-xs text-cream/45">{it.category}{it.note ? ` · ${it.note}` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => toggle(it)} className={it.available ? btnGhost : btnDanger}>
                  {it.available ? "Live" : "86'd"}
                </button>
                <button onClick={() => { setEditing(it.id); setForm({ name: it.name, category: it.category, price: String(it.price), note: it.note ?? "" }); }} className={btnGhost}>
                  Edit
                </button>
                <button onClick={() => remove(it.id)} className={btnDanger}>Del</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Offers (banner strip shown on /order) ── */

type Offer = { id: string; title: string; description: string; active: boolean };

function OffersTab() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState({ title: "", description: "" });

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "offers"), (snap) =>
      setOffers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Offer, "id">) })))
    );
  }, []);

  async function add() {
    if (!db || !form.title.trim()) return;
    await setDoc(doc(db, "offers", `offer-${Date.now()}`), {
      title: form.title.trim(),
      description: form.description.trim(),
      active: true,
      createdAt: serverTimestamp(),
    });
    setForm({ title: "", description: "" });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="h-fit rounded-sm border border-cream/10 bg-forest-850 p-6">
        <h3 className="font-display text-lg font-bold text-cream">New offer</h3>
        <div className="mt-4 space-y-3">
          <input className={field} placeholder="Title (e.g. 20% off opening week — OPENINGDAY)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={field} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button onClick={add} className={btnGold}>Publish</button>
          <p className="font-body text-xs text-cream/40">Active offers show as a banner on the order page.</p>
        </div>
      </div>
      <div className="space-y-2">
        {offers.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 rounded-sm border border-cream/10 bg-forest-850 px-4 py-3">
            <div>
              <p className="font-body text-sm font-bold text-cream">{o.title}</p>
              {o.description && <p className="font-body text-xs text-cream/45">{o.description}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => db && setDoc(doc(db, "offers", o.id), { ...o, active: !o.active })} className={o.active ? btnGhost : btnDanger}>
                {o.active ? "Active" : "Off"}
              </button>
              <button onClick={() => db && deleteDoc(doc(db, "offers", o.id))} className={btnDanger}>Del</button>
            </div>
          </div>
        ))}
        {offers.length === 0 && <p className="font-body text-sm text-cream/45">No offers yet.</p>}
      </div>
    </div>
  );
}

/* ── Coupons CRUD (extends the built-in codes) ── */

type CouponDoc = { id: string; type: "percent" | "flat"; value: number; minOrder?: number; active: boolean };

function CouponsTab() {
  const [coupons, setCoupons] = useState<CouponDoc[]>([]);
  const [form, setForm] = useState({ code: "", type: "percent" as "percent" | "flat", value: "", minOrder: "" });

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "coupons"), (snap) =>
      setCoupons(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CouponDoc, "id">) })))
    );
  }, []);

  async function add() {
    if (!db) return;
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    if (!code || !value) return;
    await setDoc(doc(db, "coupons", code), {
      type: form.type,
      value,
      minOrder: Number(form.minOrder) || 0,
      active: true,
      createdAt: serverTimestamp(),
    });
    setForm({ code: "", type: "percent", value: "", minOrder: "" });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="h-fit rounded-sm border border-cream/10 bg-forest-850 p-6">
        <h3 className="font-display text-lg font-bold text-cream">New coupon</h3>
        <div className="mt-4 space-y-3">
          <input className={field + " uppercase"} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <div className="flex gap-2">
            <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percent" | "flat" })}>
              <option value="percent" className="bg-forest-900">% off</option>
              <option value="flat" className="bg-forest-900">₹ flat off</option>
            </select>
            <input className={field} placeholder={form.type === "percent" ? "%" : "₹"} type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <input className={field} placeholder="Min order ₹ (optional)" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
          <button onClick={add} className={btnGold}>Create</button>
          <p className="font-body text-xs text-cream/40">Built-ins (WELCOME10, ORBEAN50, MATCHA15, OPENINGDAY) live in code; these add to them.</p>
        </div>
      </div>
      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-sm border border-cream/10 bg-forest-850 px-4 py-3">
            <p className="font-body text-sm text-cream">
              <span className="font-mono font-bold text-gold-400">{c.id}</span>{" "}
              — {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
              {c.minOrder ? ` (min ₹${c.minOrder})` : ""}
            </p>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => db && setDoc(doc(db, "coupons", c.id), { ...c, active: !c.active })} className={c.active ? btnGhost : btnDanger}>
                {c.active ? "Active" : "Off"}
              </button>
              <button onClick={() => db && deleteDoc(doc(db, "coupons", c.id))} className={btnDanger}>Del</button>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <p className="font-body text-sm text-cream/45">No Firestore coupons yet (built-ins still work).</p>}
      </div>
    </div>
  );
}

/* ── Customers ── */

type Customer = { id: string; name?: string; phone?: string; email?: string; memberCode?: string; updatedAt?: Timestamp };

function CustomersTab() {
  const [list, setList] = useState<Customer[]>([]);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "users"), (snap) =>
      setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Customer, "id">) })))
    );
  }, []);
  return (
    <div className="overflow-hidden rounded-sm border border-cream/10">
      <table className="w-full text-left font-body text-sm">
        <thead className="bg-forest-850 text-[11px] uppercase tracking-brand text-cream/45">
          <tr>
            <th className="px-4 py-3 font-bold">Name</th>
            <th className="px-4 py-3 font-bold">Email</th>
            <th className="px-4 py-3 font-bold">Phone</th>
            <th className="px-4 py-3 font-bold">Member</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className="border-t border-cream/10">
              <td className="px-4 py-2.5 text-cream/85">{c.name ?? "—"}</td>
              <td className="px-4 py-2.5 text-cream/60">{c.email ?? "—"}</td>
              <td className="px-4 py-2.5 text-cream/60">{c.phone ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono text-gold-400">{c.memberCode ?? "—"}</td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td className="px-4 py-4 text-cream/45" colSpan={4}>No customer profiles yet — they appear when signed-in users order or save their profile.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Staff (roster + PINs for the /staff check-in portal) ── */

function StaffTab() {
  const [list, setList] = useState<{ id: string; name: string; role: string; active: boolean }[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Jr. Barista");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "staff_members"), (s) =>
      setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as { name: string; role: string; active: boolean }) })).sort((a, b) => a.name.localeCompare(b.name)))
    );
  }, []);

  async function add() {
    if (!db) return;
    if (!name.trim()) return setMsg("Name required.");
    if (!/^\d{4}$/.test(pin)) return setMsg("PIN must be exactly 4 digits.");
    const id = `stf-${Date.now()}`;
    const { pinHash } = await import("@/lib/staff");
    await setDoc(doc(db, "staff_members", id), {
      name: name.trim(),
      role,
      pinHash: await pinHash(pin, id),
      active: true,
      createdAt: serverTimestamp(),
    });
    setName(""); setPin("");
    setMsg(`${name.trim()} added — they check in at /staff with that PIN.`);
  }

  async function resetPin(id: string, who: string) {
    if (!db) return;
    const fresh = String(Math.floor(1000 + Math.random() * 9000));
    const { pinHash } = await import("@/lib/staff");
    await setDoc(doc(db, "staff_members", id), { pinHash: await pinHash(fresh, id) }, { merge: true });
    setMsg(`${who}'s new PIN: ${fresh} — tell them privately.`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="h-fit rounded-sm border border-cream/10 bg-forest-850 p-6">
        <h3 className="font-display text-lg font-bold text-cream">Add team member</h3>
        <div className="mt-4 space-y-3">
          <input className={field} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
            {["Manager", "Sr. Barista", "Jr. Barista", "Kitchen & Juice", "Steward", "Part-time"].map((r) => (
              <option key={r} value={r} className="bg-forest-900">{r}</option>
            ))}
          </select>
          <input className={field} placeholder="4-digit PIN" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <button onClick={add} className={btnGold}>Add to roster</button>
          {msg && <p className="font-body text-xs text-[#7fcb9b]">{msg}</p>}
          <p className="font-body text-xs text-cream/40">
            They check in/out on the Staff Portal (<span className="text-gold-400">/staff</span>) with name + PIN. PINs are stored hashed.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-lg font-bold text-cream">Roster ({list.length})</h3>
        {list.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 rounded-sm border border-cream/10 bg-forest-850 px-4 py-3">
            <div>
              <p className="font-body text-sm font-bold text-cream">{m.name}</p>
              <p className="font-body text-xs text-cream/45">{m.role}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => db && setDoc(doc(db, "staff_members", m.id), { active: !m.active }, { merge: true })} className={m.active !== false ? btnGhost : btnDanger}>
                {m.active !== false ? "Active" : "Inactive"}
              </button>
              <button onClick={() => resetPin(m.id, m.name)} className={btnGhost}>Reset PIN</button>
              <button onClick={() => db && deleteDoc(doc(db, "staff_members", m.id))} className={btnDanger}>Del</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="font-body text-sm text-cream/45">No staff yet — add your opening team.</p>}
      </div>
    </div>
  );
}

/* ── Feedback ── */

type Feedback = { id: string; name?: string; email?: string; message: string; createdAt?: Timestamp };

function FeedbackTab() {
  const [list, setList] = useState<Feedback[]>([]);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "feedback"), (snap) => {
      const l = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Feedback, "id">) }));
      l.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setList(l);
    });
  }, []);
  return (
    <div className="space-y-3">
      {list.map((f) => (
        <div key={f.id} className="rounded-sm border border-cream/10 bg-forest-850 p-4">
          <p className="font-body text-sm text-cream/85">{f.message}</p>
          <p className="mt-2 font-body text-xs text-cream/40">
            {f.name ?? "Anonymous"}{f.email ? ` · ${f.email}` : ""}
            {f.createdAt ? ` · ${f.createdAt.toDate().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}
          </p>
        </div>
      ))}
      {list.length === 0 && <p className="font-body text-sm text-cream/45">No feedback yet — contact-form messages land here.</p>}
    </div>
  );
}

/* ── Settings ── */

function SettingsTab() {
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [banner, setBanner] = useState("");
  const [upiVpa, setUpiVpa] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, "settings", "site"), (snap) => {
      const d = snap.data() as { orderingEnabled?: boolean; banner?: string; upiVpa?: string } | undefined;
      if (d) {
        setOrderingEnabled(d.orderingEnabled !== false);
        setBanner(d.banner ?? "");
        setUpiVpa(d.upiVpa ?? "");
      }
      setLoaded(true);
    });
  }, []);

  async function save() {
    if (!db) return;
    await setDoc(
      doc(db, "settings", "site"),
      { orderingEnabled, banner: banner.trim(), upiVpa: upiVpa.trim(), updatedAt: serverTimestamp() },
      { merge: true }
    );
    setMsg("Saved — live immediately.");
    setTimeout(() => setMsg(""), 3000);
  }

  if (!loaded) return <p className="font-body text-cream/50">Loading…</p>;

  return (
    <div className="max-w-xl space-y-5 rounded-sm border border-cream/10 bg-forest-850 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-base font-bold text-cream">Online ordering</p>
          <p className="font-body text-xs text-cream/45">Turn off after hours — /order shows a closed notice.</p>
        </div>
        <button
          onClick={() => setOrderingEnabled((v) => !v)}
          className={`rounded-full px-5 py-2 font-body text-[11px] font-bold uppercase tracking-brand ${
            orderingEnabled ? "bg-[#3E7C5A]/25 text-[#7fcb9b]" : "bg-red-500/15 text-red-300"
          }`}
        >
          {orderingEnabled ? "Open" : "Closed"}
        </button>
      </div>
      <div>
        <p className="font-display text-base font-bold text-cream">Site banner</p>
        <input className={field + " mt-2"} placeholder="e.g. Grand opening 12 July — first 100 cups free!" value={banner} onChange={(e) => setBanner(e.target.value)} />
      </div>
      <div>
        <p className="font-display text-base font-bold text-cream">UPI VPA (your own gateway)</p>
        <p className="font-body text-xs text-cream/45">
          The shop&rsquo;s UPI ID (e.g. <span className="font-mono">orbean@okhdfcbank</span>). When set, checkout offers
          &ldquo;Pay now · UPI&rdquo; — a zero-fee intent link + QR straight to your bank. Blank = counter payment only.
        </p>
        <input className={field + " mt-2 font-mono"} placeholder="yourshop@bank" value={upiVpa} onChange={(e) => setUpiVpa(e.target.value)} />
      </div>
      <button onClick={save} className={btnGold}>Save settings</button>
      {msg && <p className="font-body text-xs text-[#7fcb9b]">{msg}</p>}
    </div>
  );
}
