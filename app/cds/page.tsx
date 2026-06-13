"use client";

// CUSTOMER DISPLAY (CDS) — tab 2 of 5. Faces the guest at the counter:
// big "preparing" and "ready" order codes, brand-first, zero actions.

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import QRCode from "qrcode";
import { auth, db, isAdmin } from "@/lib/firebase";
import { BRAND } from "@/lib/brand";
import { orderCode } from "@/lib/orders";
import { ingredientsFor, ADDON_LAYERS } from "@/lib/menu";
import { usePresence } from "@/lib/presence";
import DrinkGlass from "@/components/DrinkGlass";
import FoodPlate from "@/components/FoodPlate";

type LiveLine = { name: string; size?: string | null; temp?: string | null; addons?: string[]; qty: number; price: number };
type Ord = { id: string; name: string; status: string; createdAt?: Timestamp };
type LiveBill = { lines: LiveLine[]; total: number; pay: string; atMs: number };
const inr = (n: number) => "₹" + (n ?? 0).toLocaleString("en-IN");
const FOOD_PLATE_NAMES = ["Classic Croissant", "Avocado Toast", "Cheesecake Slice"];

export default function CDS() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [clock, setClock] = useState("");
  usePresence("cds", "Customer Display");

  useEffect(() => (auth ? onAuthStateChanged(auth, setUser) : undefined), []);
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }));
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, []);
  const admin = isAdmin(user?.email);
  const [live, setLive] = useState<LiveBill | null>(null);
  const [upiVpa, setUpiVpa] = useState("");
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!db || !admin) return;
    return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (s) =>
      setOrders(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ord, "id">) })))
    );
  }, [admin]);
  // mirror of what the cashier is ringing up right now (public-read settings)
  useEffect(() => {
    if (!db) return;
    const u1 = onSnapshot(doc(db, "settings", "cashier_live"), (s) => setLive((s.data() as LiveBill) ?? null));
    const u2 = onSnapshot(doc(db, "settings", "site"), (s) => setUpiVpa((s.data() as { upiVpa?: string })?.upiVpa ?? ""));
    return () => { u1(); u2(); };
  }, []);
  const billActive = !!live && live.lines.length > 0 && Date.now() - live.atMs < 10 * 60_000;
  const showUpi = billActive && live!.pay === "upi" && !!upiVpa && live!.total > 0;
  useEffect(() => {
    if (!showUpi) { setQr(""); return; }
    const p = new URLSearchParams({ pa: upiVpa, pn: BRAND.business.name, am: String(live!.total), tn: "Counter order", cu: "INR" });
    QRCode.toDataURL("upi://pay?" + p.toString(), { width: 360, margin: 1, color: { dark: "#0D0E08", light: "#F4ECDD" } }).then(setQr).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpi, live?.total, upiVpa]);

  const preparing = orders.filter((o) => ["new", "preparing"].includes(o.status)).slice(0, 8);
  const ready = orders.filter((o) => o.status === "ready").slice(0, 6);
  const first = (n: string) => (n || "").split(" ")[0];

  return (
    <main className="flex min-h-screen flex-col bg-forest-950 p-8 text-cream">
      <div className="flex items-center justify-between">
        <p className="font-display text-3xl font-bold">ORB<span className="rgb-text">É</span>AN <span className="text-gold-400">COFFEE</span></p>
        <p className="font-display text-3xl font-bold tabular-nums text-gold-400">{clock}</p>
      </div>

      {!admin ? (
        <div className="flex flex-1 items-center justify-center text-center">
          <div>
            <p className="font-display text-2xl font-bold">Customer Display</p>
            <p className="mt-2 font-body text-sm text-cream/55">Sign this tablet in once with the shop account.</p>
            <a href="/login" className="mt-5 inline-block rounded-full bg-gold-500 px-6 py-3 font-body text-xs font-bold uppercase tracking-brand text-forest-950">Sign in →</a>
          </div>
        </div>
      ) : showUpi && qr ? (
        /* UPI front-and-centre: scan to pay, amount loaded */
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-body text-sm font-bold uppercase tracking-brand text-gold-400">⚡ Scan to pay by UPI</p>
          <p className="mt-2 font-display text-6xl font-bold text-cream">{inr(live!.total)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="UPI payment QR" className="mt-6 rounded-lg border-4 border-gold-500/40" />
          <p className="mt-4 font-body text-sm text-cream/55">GPay · PhonePe · Paytm — any UPI app</p>
        </div>
      ) : billActive ? (
        /* live mirror of the bill being rung up — each drink/dish builds
           itself on screen, and re-pours whenever the cashier changes it */
        <div className="mx-auto mt-6 w-full max-w-3xl flex-1">
          <p className="font-body text-sm font-bold uppercase tracking-brand text-gold-400">Crafting your order…</p>
          <div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {live!.lines.map((l, i) => {
              const isPlate = FOOD_PLATE_NAMES.includes(l.name);
              const extras = (l.addons ?? []).map((n) => ADDON_LAYERS[n]).filter(Boolean);
              const key = `${l.name}|${l.size}|${l.temp}|${(l.addons ?? []).join("+")}|${l.qty}`;
              return (
                <div key={i} className="flex flex-col items-center rounded-lg border border-cream/10 bg-forest-850 p-3 text-center">
                  {isPlate ? (
                    <FoodPlate name={l.name} animKey={key} />
                  ) : (
                    <DrinkGlass
                      layers={ingredientsFor(l.name)}
                      extras={extras}
                      animKey={key}
                      size={(l.size as "s" | "m" | "l") ?? "m"}
                      temp={l.temp === "hot" ? "hot" : "iced"}
                      compact
                    />
                  )}
                  <p className="mt-2 font-body text-sm font-bold text-cream/90">{l.qty}× {l.name}</p>
                  <p className="font-body text-[11px] text-cream/45">
                    {[l.size ? String(l.size).toUpperCase() : null, l.temp, ...(l.addons ?? [])].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 font-body text-sm tabular-nums text-gold-400">{inr(l.price * l.qty)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gold-500/30 pt-4">
            <span className="font-body text-sm font-bold uppercase tracking-brand text-cream/50">Total</span>
            <span className="font-display text-4xl font-bold text-gold-400">{inr(live!.total)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid flex-1 gap-8 lg:grid-cols-2">
          <section>
            <h2 className="font-body text-sm font-bold uppercase tracking-brand text-[#E0852F]">● Now brewing</h2>
            <div className="mt-4 space-y-3">
              {preparing.length === 0 && <p className="font-body text-cream/40">Your order goes straight to the bar ☕</p>}
              {preparing.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-cream/10 bg-forest-850 px-5 py-4">
                  <span className="font-display text-3xl font-bold text-cream/85">{orderCode(o.id)}</span>
                  <span className="font-body text-lg text-cream/50">{first(o.name)}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-body text-sm font-bold uppercase tracking-brand text-[#7fcb9b]">✓ Ready — enjoy!</h2>
            <div className="mt-4 space-y-3">
              {ready.length === 0 && <p className="font-body text-cream/40">Nothing waiting — fresh is fast here.</p>}
              {ready.map((o) => (
                <div key={o.id} className="flex animate-pulse items-center justify-between rounded-lg border border-[#3E7C5A]/60 bg-[#3E7C5A]/15 px-5 py-5">
                  <span className="font-display text-4xl font-bold text-[#7fcb9b]">{orderCode(o.id)}</span>
                  <span className="font-body text-xl font-bold text-cream/85">{first(o.name)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <p className="mt-6 text-center font-body text-xs uppercase tracking-brand text-cream/30">
        {BRAND.business.tagline} · earn rewards every visit · powered by <span className="rgb-cyber font-bold">{BRAND.name.toUpperCase()}</span>
      </p>
    </main>
  );
}
