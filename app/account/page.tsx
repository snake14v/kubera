"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  or,
  query,
  setDoc,
  serverTimestamp,
  where,
  Timestamp,
} from "firebase/firestore";
import StickerGlass from "@/components/StickerGlass";
import { type Strength } from "@/components/DrinkGlass";
import QRCode from "qrcode";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { auth, db } from "@/lib/firebase";
import { memberCodeFor, phoneKey } from "@/lib/loyalty";
import { orderCode, SIZE_LABEL, type SizeKey } from "@/lib/orders";
import { Eyebrow } from "@/components/ui";

type Order = {
  id: string;
  type: "dinein" | "pickup" | "delivery";
  lines: { name: string; size: SizeKey | null; qty: number }[];
  total: number;
  status: string;
  coupon?: string | null;
  createdAt?: Timestamp;
};

// Digital twin of the printed collectible sticker — granted by the Sticker
// Studio, matched to this guest by uid / member code / phone.
type Collectible = {
  id: string;
  code: string;
  drink: { name: string; size?: string | null; temp?: string | null; addons: string[]; sugarFree: boolean; strength: Strength | null };
  tier: { name: string; color: string; ink: string };
  quarter: string;
  atMs: number;
};

const STATUS_COLOR: Record<string, string> = {
  new: "#E0A23C",
  preparing: "#8B9DE0",
  ready: "#7FC8A9",
  done: "#8FB573",
  cancelled: "#D24B5A",
};

const inr = (n: number) => "₹" + (n ?? 0).toLocaleString("en-IN");
const field =
  "w-full rounded-full border border-cream/15 bg-forest-850/80 px-5 py-3 font-body text-sm text-cream outline-none transition-colors placeholder:text-cream/40 focus:border-gold-500";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  return (
    <main>
      <Nav />
      <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-12 sm:px-8">
        {!ready ? (
          <p className="font-body text-cream/50">Loading…</p>
        ) : !user ? (
          <div className="max-w-md py-10">
            <Eyebrow>Your account</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-bold text-cream">Sign in to see your dashboard.</h1>
            <p className="mt-3 font-body text-cream/60">
              Orders, rewards card, and your saved details live here.
            </p>
            <a href="/login" className="btn-sheen mt-6 inline-block rounded-full bg-gold-500 px-8 py-3.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">
              Sign in / Register →
            </a>
          </div>
        ) : (
          <DashboardInner user={user} />
        )}
      </section>
      <Footer />
    </main>
  );
}

function DashboardInner({ user }: { user: User }) {
  const memberCode = user.email ? memberCodeFor(user.email) : null;
  const [qr, setQr] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState(user.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState("");
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  // phone used for collectible lookup — only updates on load/save, not per keystroke
  const [lookupPhone, setLookupPhone] = useState("");

  useEffect(() => {
    if (!memberCode) return;
    QRCode.toDataURL(memberCode, { margin: 1, width: 240, color: { dark: "#14160E", light: "#E8DFC9" } })
      .then(setQr)
      .catch(() => {});
  }, [memberCode]);

  // profile
  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, "users", user.uid)).then((s) => {
      const p = s.data() as { name?: string; phone?: string } | undefined;
      if (p?.name) setName(p.name);
      if (p?.phone) { setPhone(p.phone); setLookupPhone(p.phone); }
    });
  }, [user.uid]);

  // Collectible docs are world-readable, so they carry a phone HASH, never
  // the raw number — hash ours the same way to match.
  const [phoneHash, setPhoneHash] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    if (!lookupPhone.trim()) { setPhoneHash(null); return; }
    phoneKey(lookupPhone).then((h) => { if (on) setPhoneHash(h); }).catch(() => {});
    return () => { on = false; };
  }, [lookupPhone]);

  // my digital collectibles (live) — matched by uid OR member code OR phone hash
  useEffect(() => {
    if (!db) return;
    const clauses = [where("uid", "==", user.uid)];
    if (memberCode) clauses.push(where("memberCode", "==", memberCode));
    if (phoneHash) clauses.push(where("phoneHash", "==", phoneHash));
    return onSnapshot(query(collection(db, "collectibles"), or(...clauses)), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Collectible, "id">) }));
      list.sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));
      setCollectibles(list);
    });
  }, [user.uid, memberCode, phoneHash]);

  // my orders (live)
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "orders"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setOrders(list);
    });
  }, [user.uid]);

  async function saveProfile() {
    if (!db) return;
    await setDoc(
      doc(db, "users", user.uid),
      { name: name.trim(), phone: phone.trim(), email: user.email ?? null, memberCode, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setSaved("Saved — checkout will prefill these.");
    setLookupPhone(phone.trim());
    setTimeout(() => setSaved(""), 3000);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Your account</Eyebrow>
          <h1 className="mt-2 font-display text-4xl font-bold text-cream">
            Hey, <span className="rgb-text">{(name || user.email || "friend").split(/[@\s]/)[0]}.</span>
          </h1>
        </div>
        <button
          onClick={() => auth && signOut(auth)}
          className="rounded-full border border-cream/20 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 hover:border-red-400 hover:text-red-300"
        >
          Sign out
        </button>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Rewards card */}
        <div className="rgb-ring relative overflow-hidden rounded-lg border border-gold-500/30 bg-gradient-to-br from-forest-850 to-forest-900 p-6">
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Rewards card</p>
          <div className="mt-4 flex items-center gap-5">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Member QR" className="h-32 w-32 rounded-sm" />
            ) : (
              <div className="h-32 w-32 rounded-sm border border-cream/15" />
            )}
            <div>
              <p className="font-mono text-base tracking-widest text-cream">{memberCode}</p>
              <p className="mt-1 font-body text-xs text-cream/50">Scan at the counter to earn beans.</p>
              <a href="/rewards" className="mt-3 inline-block font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 hover:text-gold-500">
                Full rewards →
              </a>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="rounded-sm border border-cream/10 bg-forest-850 p-6">
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Profile</p>
          <div className="mt-4 space-y-3">
            <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={field} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="font-body text-xs text-cream/40">{user.email}</p>
            <button onClick={saveProfile} className="rounded-full bg-gold-500 px-6 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">
              Save
            </button>
            {saved && <p className="font-body text-xs text-[#7fcb9b]">{saved}</p>}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-sm border border-cream/10 bg-forest-850 p-6">
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Quick actions</p>
          <div className="mt-4 flex flex-col gap-2.5">
            <a href="/order" className="btn-sheen rounded-full bg-gold-500 px-6 py-3 text-center font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">
              Order now →
            </a>
            <a href="/menu" className="rounded-full border border-cream/20 px-6 py-3 text-center font-body text-[11px] font-bold uppercase tracking-brand text-cream/70 hover:border-gold-500 hover:text-gold-400">
              Browse menu
            </a>
            <a href="/contact" className="rounded-full border border-cream/20 px-6 py-3 text-center font-body text-[11px] font-bold uppercase tracking-brand text-cream/70 hover:border-gold-500 hover:text-gold-400">
              Help & contact
            </a>
          </div>
        </div>
      </div>

      {/* Digital collectibles — twins of the printed stickers */}
      <div className="mt-12 flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-2xl font-bold text-cream">Your collectibles</h2>
        {collectibles.length > 0 && (
          <span className="rounded-full bg-gold-500/15 px-3 py-1 font-body text-xs font-bold text-gold-400">
            {collectibles.length} collected · {new Set(collectibles.map((c) => c.drink?.name)).size} drinks
          </span>
        )}
      </div>
      {collectibles.length === 0 ? (
        <p className="mt-3 font-body text-sm text-cream/50">
          Every drink you order earns a collectible card in your tier colour — they land here. Tiers reset each quarter, so collect the whole rainbow ☕
        </p>
      ) : (
        <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2">
          {collectibles.map((c) => (
            <div key={c.id} className="w-[150px] shrink-0 rounded-xl p-1.5" style={{ backgroundColor: c.tier?.color ?? "#F4ECDD", color: c.tier?.ink ?? "#14160E" }}>
              <div className="flex h-[190px] flex-col items-center justify-between rounded-lg border-2 p-2.5" style={{ borderColor: (c.tier?.ink ?? "#14160E") + "66", backgroundColor: "#14160E" }}>
                <p className="font-display text-[9px] font-bold tracking-widest" style={{ color: c.tier?.color }}>ORBÉAN · COLLECT</p>
                <StickerGlass
                  name={c.drink?.name ?? "House Brew"}
                  addons={(c.drink?.addons ?? []).filter((n) => !/sugar|sweet/i.test(n))}
                  hot={c.drink?.temp === "hot"}
                  sugarFree={!!c.drink?.sugarFree}
                  strength={c.drink?.strength ?? null}
                  size={68}
                />
                <div className="text-center">
                  <p className="font-display text-[11px] font-bold leading-tight text-[#E8DFC9]">{c.drink?.name}</p>
                  <p className="font-body text-[8px] uppercase tracking-widest" style={{ color: c.tier?.color }}>★ {c.tier?.name} · {c.quarter}</p>
                  <p className="font-body text-[7px] text-[#E8DFC9]/40">{c.code}{c.atMs ? ` · ${new Date(c.atMs).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orders */}
      <h2 className="mt-12 font-display text-2xl font-bold text-cream">Your orders</h2>
      {orders.length === 0 ? (
        <p className="mt-3 font-body text-cream/50">
          No orders yet —{" "}
          <a href="/order" className="text-gold-400 underline decoration-gold-400/40 underline-offset-2">
            fix that ☕
          </a>
        </p>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-sm border border-cream/10 bg-forest-850 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-lg font-bold text-gold-400">{orderCode(o.id)}</span>
                <span
                  className="rounded-full px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-brand"
                  style={{ backgroundColor: (STATUS_COLOR[o.status] ?? "#888") + "26", color: STATUS_COLOR[o.status] ?? "#aaa" }}
                >
                  {o.status}
                </span>
              </div>
              <p className="mt-2 font-body text-sm text-cream/70">
                {o.lines?.map((l) => `${l.qty}× ${l.name}${l.size ? ` (${SIZE_LABEL[l.size]})` : ""}`).join(", ")}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-body text-xs text-cream/40">
                  {o.type}
                  {o.coupon ? ` · coupon ${o.coupon}` : ""}
                  {o.createdAt ? ` · ${o.createdAt.toDate().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                </span>
                <span className="font-display text-base font-bold text-cream">{inr(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
