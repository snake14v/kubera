"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { BRAND } from "@/lib/brand";
import { memberCodeFor } from "@/lib/loyalty";
import { resolveCoupon, BUILTIN_COUPONS, type Coupon } from "@/lib/coupons";
import {
  ORDERABLE,
  CATEGORIES,
  SIZE_LABEL,
  ADDONS,
  priceFor,
  lineKey,
  orderCode,
  DELIVERY_RADIUS_KM,
  type AddonPick,
  type OrderableItem,
  type OrderType,
  type SizeKey,
  type Temp,
} from "@/lib/orders";
import { accentFor, ingredientsFor, tasteFor, allergensFor, ADDON_LAYERS } from "@/lib/menu";
import DrinkGlass, { STRENGTHS, type Strength } from "../DrinkGlass";
import FoodPlate from "../FoodPlate";

const FOOD_PLATE_NAMES = ["Classic Croissant", "Avocado Toast", "Cheesecake Slice"];
// brew strength + sweetness ride the addons array as ₹0 entries — they flow
// through cart → order doc → KDS tickets → receipts with zero schema change
const SUGARS = ["Regular sweet", "Less sweet", "No sugar 🌿"] as const;
const strengthFromAddons = (names: string[]): Strength | null =>
  names.includes("Strong brew") ? "strong" : names.includes("Mild brew") ? "mild" : null;
const sugarFreeFromAddons = (names: string[]) => names.includes("No sugar 🌿");
import { CartProvider, useCart } from "./CartProvider";
import { Eyebrow } from "../ui";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-sm border border-cream/15 font-body text-sm text-cream/45">
      Loading map…
    </div>
  ),
});

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

type PlacedInfo = {
  code: string;
  orderId: string;
  type: OrderType;
  memberCode: string | null;
  payable: number;
  method: "counter" | "upi";
};

/** NPCI UPI intent link — the customer's UPI app opens pre-filled. */
function upiLink(vpa: string, amount: number, orderCode: string) {
  const p = new URLSearchParams({
    pa: vpa,
    pn: BRAND.business.name,
    am: String(amount),
    tn: orderCode,
    tr: orderCode.replace(/[^A-Za-z0-9]/g, ""),
    cu: "INR",
  });
  return "upi://pay?" + p.toString();
}

const field =
  "w-full rounded-full border border-cream/15 bg-forest-850/80 px-5 py-3 font-body text-sm text-cream outline-none transition-colors placeholder:text-cream/40 focus:border-gold-500";

export default function OrderContent() {
  return (
    <CartProvider>
      <Inner />
    </CartProvider>
  );
}

/* Live admin data: custom menu items, active offers, ordering on/off + banner */
function useLiveAdmin() {
  const [custom, setCustom] = useState<OrderableItem[]>([]);
  const [offers, setOffers] = useState<{ id: string; title: string; description?: string }[]>([]);
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [banner, setBanner] = useState("");
  const [upiVpa, setUpiVpa] = useState("");

  useEffect(() => {
    if (!db) return;
    const drinkCats = ["Matcha Collection", "Signature Lattes", "Coffee Classics", "Classic Lattes", "Macchiatos"];
    const u1 = onSnapshot(collection(db, "menu_admin"), (snap) =>
      setCustom(
        snap.docs
          .filter((d) => (d.data() as { available?: boolean }).available !== false)
          .map((d) => {
            const x = d.data() as { name: string; category: string; price: number; note?: string };
            const isDrink = drinkCats.includes(x.category);
            return {
              id: d.id,
              name: x.name,
              note: x.note,
              category: (CATEGORIES as readonly string[]).includes(x.category)
                ? (x.category as OrderableItem["category"])
                : "Food & Bakes",
              prices: null,
              price: x.price,
              tempChoice: isDrink,
              customizable: isDrink,
            } as OrderableItem;
          })
      )
    );
    const u2 = onSnapshot(collection(db, "offers"), (snap) =>
      setOffers(
        snap.docs
          .filter((d) => (d.data() as { active?: boolean }).active !== false)
          .map((d) => ({ id: d.id, ...(d.data() as { title: string; description?: string }) }))
      )
    );
    const u3 = onSnapshot(doc(db, "settings", "site"), (snap) => {
      const s = snap.data() as { orderingEnabled?: boolean; banner?: string; upiVpa?: string } | undefined;
      setOrderingEnabled(s?.orderingEnabled !== false);
      setBanner(s?.banner ?? "");
      setUpiVpa(s?.upiVpa ?? "");
    });
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  return { custom, offers, orderingEnabled, banner, upiVpa };
}

function Inner() {
  const params = useSearchParams();
  const tableParam = params.get("table");
  const addParam = params.get("add");
  const cart = useCart();
  const [step, setStep] = useState<"menu" | "checkout" | "done">("menu");
  const [placed, setPlaced] = useState<PlacedInfo | null>(null);
  const [autoAdded, setAutoAdded] = useState("");
  const { custom, offers, orderingEnabled, banner, upiVpa } = useLiveAdmin();

  // "Order now" from the menu page: ?add=<itemId> drops it straight in the cart
  // (waits for cart hydration so the localStorage load can't overwrite it)
  useEffect(() => {
    if (!addParam || !cart.ready) return;
    const item = ORDERABLE.find((i) => i.id === addParam);
    if (item) {
      cart.add(item, item.prices ? "m" : null, item.tempChoice ? "iced" : null, []);
      setAutoAdded(item.name);
      setTimeout(() => setAutoAdded(""), 4000);
    }
    // strip the param so refresh/back doesn't re-add
    const url = new URL(window.location.href);
    url.searchParams.delete("add");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addParam, cart.ready]);

  if (!orderingEnabled && step !== "done") {
    return (
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-xl rounded-sm border border-gold-500/30 bg-forest-900 p-8">
          <Eyebrow>Ordering paused</Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-bold text-cream">We&rsquo;re not taking online orders right now.</h1>
          <p className="mt-3 font-body text-cream/65">
            {banner || "Back soon — message us on WhatsApp meanwhile."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-32 sm:px-8">
      <div className="py-10 sm:py-14">
        <Eyebrow>{tableParam ? `Table ${tableParam} · dine-in` : "Order Orbéan"}</Eyebrow>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
          {step === "done" ? "Order placed." : tableParam ? "Order to your table." : "What are you craving?"}
        </h1>
        {step === "menu" && (
          <p className="mt-3 max-w-xl font-body text-cream/60">
            Hot or iced, customised your way. Pay at the counter or on delivery — UPI &amp; cards welcome.
          </p>
        )}
      </div>

      {autoAdded && (
        <div className="rise-in mb-6 rounded-sm border border-[#3E7C5A]/50 bg-[#3E7C5A]/15 px-5 py-3 font-body text-sm text-[#7fcb9b]">
          ✓ {autoAdded} added to your cart — review below or keep browsing.
        </div>
      )}

      {/* live offers banner */}
      {step === "menu" && (banner || offers.length > 0) && (
        <div className="mb-8 space-y-2">
          {banner && (
            <div className="rgb-ring rounded-sm border border-gold-500/30 bg-forest-900 px-5 py-3 font-body text-sm text-gold-400">
              ✦ {banner}
            </div>
          )}
          {offers.map((o) => (
            <div key={o.id} className="rounded-sm border border-cream/10 bg-forest-850 px-5 py-3">
              <span className="font-body text-sm font-bold text-cream">{o.title}</span>
              {o.description && <span className="ml-2 font-body text-xs text-cream/50">{o.description}</span>}
            </div>
          ))}
        </div>
      )}

      {step === "menu" && <MenuBrowser extra={custom} />}
      {step === "checkout" && (
        <Checkout
          presetTable={tableParam}
          upiVpa={upiVpa}
          onPlaced={(p) => {
            setPlaced(p);
            cart.clear();
            setStep("done");
          }}
          onBack={() => setStep("menu")}
        />
      )}
      {step === "done" && placed && <Done {...placed} vpa={upiVpa} />}

      {step === "menu" && cart.count > 0 && (
        <div className="rise-in safe-bottom fixed inset-x-0 bottom-[56px] z-40 border-t border-gold-500/30 bg-forest-950/95 backdrop-blur-md lg:bottom-0">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <p className="font-body text-sm text-cream/80">
              <span key={cart.count} className="bump inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gold-500 px-2 font-bold text-forest-950">
                {cart.count}
              </span>{" "}
              item{cart.count === 1 ? "" : "s"} ·{" "}
              <span className="font-display text-lg font-bold text-cream">{inr(cart.total)}</span>
            </p>
            <button
              onClick={() => setStep("checkout")}
              className="btn-sheen rounded-full bg-gold-500 px-8 py-3.5 font-body text-[12px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700"
            >
              Review order →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Menu browser: sticky slide selector + scrollspy sections + search ── */

const slug = (c: string) => "cat-" + c.toLowerCase().replace(/[^a-z]+/g, "-");

function MenuBrowser({ extra = [] }: { extra?: OrderableItem[] }) {
  const cart = useCart();
  const all = useMemo(() => [...ORDERABLE, ...extra], [extra]);
  const [active, setActive] = useState<string>(CATEGORIES[0]);
  const [q, setQ] = useState("");

  const searching = q.trim().length > 0;
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    // deep search: name + description + tasting notes + ingredient composition
    return all.filter(
      (i) =>
        i.name.toLowerCase().includes(t) ||
        (i.note ?? "").toLowerCase().includes(t) ||
        (tasteFor(i.name) ?? "").toLowerCase().includes(t) ||
        ingredientsFor(i.name).some((ing) => ing.name.toLowerCase().includes(t))
    );
  }, [q, all]);

  // scrollspy — highlight the section under the sticky bar
  useEffect(() => {
    if (searching) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) {
          const cat = (vis[0].target as HTMLElement).dataset.cat;
          if (cat) {
            setActive(cat);
            document
              .querySelector<HTMLButtonElement>(`[data-chip="${slug(cat)}"]`)
              ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
        }
      },
      { rootMargin: "-190px 0px -60% 0px" }
    );
    CATEGORIES.forEach((c) => {
      const el = document.getElementById(slug(c));
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [searching]);

  function jump(c: string) {
    setActive(c);
    document.getElementById(slug(c))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      {/* sticky slide selector + search */}
      <div className="sticky top-[60px] z-30 -mx-5 border-b border-cream/10 bg-forest-950/95 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="relative shrink-0">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-32 rounded-full border border-cream/15 bg-forest-900 py-2.5 pl-9 pr-3 font-body text-sm text-cream outline-none transition-all placeholder:text-cream/35 focus:w-44 focus:border-gold-500 sm:w-44 sm:focus:w-56"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream/40">⌕</span>
          </div>
          <div className={`no-scrollbar flex flex-1 gap-2 overflow-x-auto scroll-smooth ${searching ? "opacity-30" : ""}`}>
            {CATEGORIES.map((c) => {
              const accent = accentFor("", c);
              const on = active === c && !searching;
              return (
                <button
                  key={c}
                  data-chip={slug(c)}
                  onClick={() => jump(c)}
                  className="shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand transition-all duration-300"
                  style={
                    on
                      ? { backgroundColor: accent + "26", color: accent, border: `1px solid ${accent}88`, transform: "scale(1.04)" }
                      : { border: "1px solid rgba(232,223,201,0.15)", color: "rgba(232,223,201,0.55)" }
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {searching ? (
        <div className="mt-6">
          <p className="font-body text-sm text-cream/50">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q.trim()}&rdquo;
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((item) => (
              <ItemCard key={item.id} item={item} onAdd={(size, temp, addons) => cart.add(item, size, temp, addons)} />
            ))}
          </div>
          {results.length === 0 && (
            <p className="mt-6 font-body text-cream/40">Nothing matches — try &ldquo;matcha&rdquo;, &ldquo;latte&rdquo; or &ldquo;juice&rdquo;.</p>
          )}
        </div>
      ) : (
        CATEGORIES.map((c) => {
          const items = all.filter((i) => i.category === c);
          if (items.length === 0) return null;
          const accent = accentFor("", c);
          return (
            <section key={c} id={slug(c)} data-cat={c} className="scroll-mt-[136px] pt-8">
              <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold text-cream">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                {c}
                <span className="font-body text-sm font-normal text-cream/35">{items.length}</span>
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} onAdd={(size, temp, addons) => cart.add(item, size, temp, addons)} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function ItemCard({
  item,
  onAdd,
}: {
  item: OrderableItem;
  onAdd: (s: SizeKey | null, t: Temp, a: AddonPick[]) => void;
}) {
  const sized = !!item.prices;
  const [size, setSize] = useState<SizeKey>("m");
  const [temp, setTemp] = useState<Temp>(item.tempChoice ? "iced" : null);
  const [custom, setCustom] = useState(false);
  const [info, setInfo] = useState(false);
  const [fullTaste, setFullTaste] = useState(false);
  const [strength, setStrength] = useState<Strength>("medium");
  const [sugar, setSugar] = useState<(typeof SUGARS)[number]>("Regular sweet");
  const [addons, setAddons] = useState<AddonPick[]>([]);
  const accent = accentFor(item.name, item.category);
  const addonTotal = addons.reduce((s, a) => s + a.price, 0);

  const toggleAddon = (a: AddonPick) =>
    setAddons((prev) => (prev.some((x) => x.name === a.name) ? prev.filter((x) => x.name !== a.name) : [...prev, a]));

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-cream/10 bg-forest-850 p-5 transition-colors duration-300">
      <span className="absolute inset-x-0 top-0 h-0.5 opacity-60 transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundColor: accent }} />
      <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25" style={{ backgroundColor: accent }} />

      <div className="relative flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-cream">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          {item.name}
        </h3>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 font-body text-xs font-bold" style={{ backgroundColor: accent + "22", color: accent }}>
          {inr(priceFor(item, sized ? size : null) + addonTotal)}
        </span>
      </div>
      {item.note && <p className="relative mt-1.5 font-body text-xs text-cream/50">{item.note}</p>}
      {tasteFor(item.name) && (
        <p
          role="button"
          tabIndex={0}
          onClick={() => setFullTaste((v) => !v)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFullTaste((v) => !v)}
          className={`relative mt-1 cursor-pointer font-body text-[11px] italic leading-relaxed transition-colors ${
            fullTaste ? "text-cream/65" : "line-clamp-2 text-cream/40"
          }`}
          title={fullTaste ? "Tap to collapse" : "Tap to read the full tasting note"}
        >
          {tasteFor(item.name)}
          {!fullTaste && <span className="not-italic text-gold-400/70"> more</span>}
        </p>
      )}

      {/* composition + allergens — tap to unfold (44px target) */}
      <button
        onClick={() => setInfo((v) => !v)}
        aria-expanded={info}
        className="relative mt-1.5 min-h-[40px] self-start py-2 text-left font-body text-[10px] font-bold uppercase tracking-brand text-cream/40 transition-colors hover:text-gold-400"
      >
        ⓘ Composition & allergens {info ? "▴" : "▾"}
      </button>
      {info && (
        <div className="relative mb-1 rounded-sm border border-cream/10 bg-forest-900 p-3">
          {tasteFor(item.name) && (
            <p className="mb-2 border-b border-cream/10 pb-2 font-body text-[11px] italic leading-relaxed text-cream/65">
              {tasteFor(item.name)}
            </p>
          )}
          <ul className="space-y-1">
            {[...ingredientsFor(item.name)].reverse().map((l) => (
              <li key={l.name} className="flex items-center justify-between font-body text-[11px] text-cream/70">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full border border-forest-950/40" style={{ backgroundColor: l.color }} />
                  {l.name}
                </span>
                <span className="tabular-nums text-cream/40">{l.pct}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-cream/10 pt-2 font-body text-[10px] uppercase tracking-brand text-cream/45">
            {allergensFor(item.name).length
              ? <>Contains: <span className="font-bold text-amber-300/90">{allergensFor(item.name).join(" · ")}</span></>
              : "No major allergens"}
            <span className="normal-case tracking-normal text-cream/30"> · made in a kitchen handling dairy, nuts & gluten</span>
            {item.customizable && (
              <span className="mt-1 block normal-case tracking-normal text-[#7fcb9b]">
                🌿 Diabetic-friendly: order &ldquo;No sugar&rdquo; — zero added sugar, skip the syrups. Stevia available at the counter.
              </span>
            )}
          </p>
        </div>
      )}

      {/* options + live composition glass: size morphs S/M/L, hot steams,
          iced drops cubes, add-ons pour in as you tick them */}
      <div className="relative mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {sized &&
              (Object.keys(SIZE_LABEL) as SizeKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={`min-h-[40px] rounded-full px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand transition-all ${
                    size === s ? "scale-105 bg-gold-500/20 text-gold-400" : "border border-cream/15 text-cream/50 hover:border-gold-500/40"
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            {item.tempChoice && (
              <div className="flex min-h-[40px] overflow-hidden rounded-full border border-cream/15">
                {(["hot", "iced"] as Temp[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemp(t)}
                    aria-pressed={temp === t}
                    className={`px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand transition-colors ${
                      temp === t ? "bg-gold-500/20 text-gold-400" : "text-cream/50"
                    }`}
                  >
                    {t === "hot" ? "Hot" : "Iced"}
                  </button>
                ))}
              </div>
            )}
            {item.customizable && (
              <span className="flex overflow-hidden rounded-full border border-cream/15" title="Brew strength">
                {(Object.keys(STRENGTHS) as Strength[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setStrength(k)}
                    aria-pressed={strength === k}
                    className="min-h-[40px] px-3 font-body text-[10px] font-bold uppercase tracking-brand transition-all"
                    style={
                      strength === k
                        ? { backgroundColor: STRENGTHS[k].color, backgroundImage: STRENGTHS[k].pattern, backgroundSize: STRENGTHS[k].patternSize, color: k === "mild" ? "#3a2a18" : "#F4ECDD" }
                        : { color: "rgba(232,223,201,0.5)" }
                    }
                  >
                    {STRENGTHS[k].label}
                  </button>
                ))}
              </span>
            )}
            {item.customizable && (
              <button
                onClick={() => setSugar((v) => SUGARS[(SUGARS.indexOf(v) + 1) % SUGARS.length])}
                aria-label="Sweetness"
                className={`min-h-[40px] rounded-full px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand transition-colors ${
                  sugar === "No sugar 🌿" ? "bg-[#3E7C5A]/25 text-[#7fcb9b]" : sugar === "Less sweet" ? "bg-gold-500/15 text-gold-400" : "border border-cream/15 text-cream/50"
                }`}
              >
                {sugar}
              </button>
            )}
            {item.customizable && (
              <button
                onClick={() => setCustom((c) => !c)}
                aria-expanded={custom}
                className={`min-h-[40px] rounded-full px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand transition-colors ${
                  custom || addons.length ? "bg-gold-500/20 text-gold-400" : "border border-cream/15 text-cream/50 hover:border-gold-500/40"
                }`}
              >
                Customise{addons.length ? ` · ${addons.length}` : " +"}
              </button>
            )}
          </div>

          {/* addons */}
          {custom && item.customizable && (
            <div className="mt-3 space-y-1.5 rounded-sm border border-cream/10 bg-forest-900 p-3">
              {ADDONS.map((a) => {
                const on = addons.some((x) => x.name === a.name);
                return (
                  <button
                    key={a.name}
                    onClick={() => toggleAddon(a)}
                    className="flex w-full items-center justify-between gap-3 font-body text-xs"
                  >
                    <span className={`flex items-center gap-2 ${on ? "text-gold-400" : "text-cream/60"}`}>
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${
                          on ? "border-gold-500 bg-gold-500 text-forest-950" : "border-cream/25"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      {a.name}
                    </span>
                    <span className={on ? "text-gold-400" : "text-cream/40"}>+{inr(a.price)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {FOOD_PLATE_NAMES.includes(item.name) ? (
          <FoodPlate name={item.name} animKey={item.id} />
        ) : (
          <DrinkGlass
            compact
            layers={ingredientsFor(item.name)}
            extras={addons.map((a) => ADDON_LAYERS[a.name]).filter(Boolean)}
            size={sized ? size : "m"}
            temp={item.tempChoice ? temp : "iced"}
            strength={item.customizable ? strength : null}
            sugarFree={sugar === "No sugar 🌿"}
            animKey={`${item.id}|${temp}|${strength}|${sugar}|${addons.map((a) => a.name).join("+")}`}
          />
        )}
      </div>

      <CardActions
        item={item}
        sized={sized}
        size={size}
        temp={temp}
        addons={
          item.customizable
            ? [
                ...addons,
                ...(strength !== "medium" ? [{ name: strength === "strong" ? "Strong brew" : "Mild brew", price: 0 }] : []),
                ...(sugar !== "Regular sweet" ? [{ name: sugar, price: 0 }] : []),
              ]
            : addons
        }
        onAdd={onAdd}
      />
    </div>
  );
}

/** Add button / qty stepper / in-cart chip — the card's action row. */
function CardActions({
  item,
  sized,
  size,
  temp,
  addons,
  onAdd,
}: {
  item: OrderableItem;
  sized: boolean;
  size: SizeKey;
  temp: Temp;
  addons: AddonPick[];
  onAdd: (s: SizeKey | null, t: Temp, a: AddonPick[]) => void;
}) {
  const cart = useCart();
  const inCart = cart.lines.filter((l) => l.id === item.id).reduce((s, l) => s + l.qty, 0);
  const simple = !sized && !item.customizable && !item.tempChoice;
  const simpleKey = lineKey(item.id, null, null, []);
  const simpleLine = simple ? cart.lines.find((l) => l.key === simpleKey) : undefined;

  return (
    <div className="relative mt-4 flex flex-1 items-end justify-between gap-3">
      {inCart > 0 ? (
        <span className="rounded-full bg-[#3E7C5A]/20 px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-[#7fcb9b]">
          {inCart} in cart ✓
        </span>
      ) : (
        <span />
      )}
      {simple && simpleLine ? (
        <div className="flex items-center gap-1 rounded-full border border-gold-500/50 bg-gold-500/10">
          <button
            aria-label={`Remove one ${item.name}`}
            onClick={() => cart.setQty(simpleKey, simpleLine.qty - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full font-display text-lg text-gold-400 transition-colors hover:bg-gold-500/20"
          >
            −
          </button>
          <span className="w-6 text-center font-display text-base font-bold tabular-nums text-cream">{simpleLine.qty}</span>
          <button
            aria-label={`Add one ${item.name}`}
            onClick={() => cart.setQty(simpleKey, simpleLine.qty + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full font-display text-lg text-gold-400 transition-colors hover:bg-gold-500/20"
          >
            +
          </button>
        </div>
      ) : (
        <button
          onClick={() => onAdd(sized ? size : null, temp, addons)}
          className="rounded-full bg-gold-500 px-6 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-all hover:bg-gold-700 active:scale-95"
        >
          Add +
        </button>
      )}
    </div>
  );
}

/* ── Checkout ── */

function Checkout({
  presetTable,
  upiVpa,
  onPlaced,
  onBack,
}: {
  presetTable: string | null;
  upiVpa: string;
  onPlaced: (p: PlacedInfo) => void;
  onBack: () => void;
}) {
  const [payMethod, setPayMethod] = useState<"counter" | "upi">("counter");
  const cart = useCart();
  const [type, setType] = useState<OrderType>(presetTable ? "dinein" : "pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [table, setTable] = useState(presetTable ?? "");
  const [tablePin, setTablePin] = useState("");
  const [pickupIn, setPickupIn] = useState("ASAP");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number; distanceKm: number; inRange: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // account linking
  const [user, setUser] = useState<User | null>(null);
  // coupon
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ c: Coupon; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");

  const onGeo = useCallback((v: { lat: number; lng: number; distanceKm: number; inRange: boolean }) => setGeo(v), []);

  // signed-in: prefill from profile (auto email↔phone↔member linking)
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.displayName) setName((n) => n || u.displayName!);
        try {
          if (db) {
            const snap = await getDoc(doc(db, "users", u.uid));
            const p = snap.data() as { name?: string; phone?: string; address?: string; landmark?: string } | undefined;
            if (p?.name) setName((n) => n || p.name!);
            if (p?.phone) setPhone((ph) => ph || p.phone!);
            if (p?.address) setAddress((a) => a || p.address!);
            if (p?.landmark) setLandmark((l) => l || p.landmark!);
          }
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (cart.count === 0) onBack();
  }, [cart.count, onBack]);

  // re-validate coupon when subtotal changes
  useEffect(() => {
    if (!coupon) return;
    resolveCoupon(coupon.c.code, cart.total).then((r) => {
      if (r.ok) setCoupon({ c: r.coupon, discount: r.discount });
      else {
        setCoupon(null);
        setCouponMsg(r.reason);
      }
    });
  }, [cart.total]); // eslint-disable-line react-hooks/exhaustive-deps

  async function tryCoupon() {
    setCouponMsg("");
    const r = await resolveCoupon(code, cart.total);
    if (r.ok) {
      setCoupon({ c: r.coupon, discount: r.discount });
      setCouponMsg(`${r.coupon.code} applied — you save ${inr(r.discount)}.`);
    } else {
      setCoupon(null);
      setCouponMsg(r.reason);
    }
  }

  const discount = coupon?.discount ?? 0;
  const payable = Math.max(0, cart.total - discount);
  const memberCode = user?.email ? memberCodeFor(user.email) : null;

  async function place() {
    setErr("");
    if (!name.trim() || !/^[0-9+\s-]{10,}$/.test(phone.trim()))
      return setErr("Please add your name and a valid phone number.");
    if (type === "dinein" && !table.trim()) return setErr("Which table are you at?");
    if (type === "dinein" && tablePin.trim().length !== 4) return setErr("Enter the 4-digit table PIN — ask your server for it.");
    if (type === "delivery") {
      if (!address.trim()) return setErr("Please add your delivery address.");
      if (!geo) return setErr("Drop your location pin on the map.");
      if (!geo.inRange) return setErr(`That pin is outside our ${DELIVERY_RADIUS_KM} km delivery zone.`);
    }
    setBusy(true);
    try {
      if (!db) throw new Error("not-configured");

      // auto-link: persist profile so phone ↔ email ↔ member QR stay one identity
      if (user) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              name: name.trim(),
              phone: phone.trim(),
              email: user.email ?? null,
              memberCode,
              ...(type === "delivery" && address.trim()
                ? { address: address.trim(), landmark: landmark.trim() }
                : {}),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {}
      }

      const docRef = await addDoc(collection(db, "orders"), {
        type,
        lines: cart.lines.map((l) => ({
          name: l.name,
          size: l.size,
          temp: l.temp,
          addons: l.addons,
          unitPrice: l.unitPrice,
          qty: l.qty,
        })),
        subtotal: cart.total,
        discount,
        coupon: coupon ? coupon.c.code : null,
        total: payable,
        name: name.trim(),
        phone: phone.trim(),
        uid: user?.uid ?? null,
        email: user?.email ?? null,
        memberCode,
        table: type === "dinein" ? table.trim() : null,
        // the table PIN the waiter issued — Firestore rules reject a dine-in
        // order whose PIN doesn't match this table's live sitting (anti-spoof)
        ...(type === "dinein" && tablePin.trim() ? { tableKey: tablePin.trim() } : {}),
        pickupIn: type === "pickup" ? pickupIn : null,
        address: type === "delivery" ? address.trim() : null,
        landmark: type === "delivery" ? landmark.trim() : null,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        distanceKm: geo ? Math.round(geo.distanceKm * 10) / 10 : null,
        // dine-in waits for the waiter's approval before the kitchen sees it
        status: type === "dinein" ? "pending" : "new",
        pos: "pending",
        payment: {
          method: payMethod,
          state: payMethod === "upi" ? "pending" : "counter",
        },
        createdAt: serverTimestamp(),
      });

      // No WhatsApp ping — the shop sees the order instantly on the live
      // boards (staff portal + admin, with the new-order chime).
      const codeStr = orderCode(docRef.id);
      onPlaced({ code: codeStr, orderId: docRef.id, type, memberCode, payable, method: payMethod });
    } catch (e) {
      setErr(
        type === "dinein"
          ? "That table PIN didn't match — ask your server for the current PIN, or switch to Pickup."
          : "Couldn't place the order — try again, or order on WhatsApp."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div>
        {/* account chip */}
        {user ? (
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-2 font-body text-xs text-gold-400">
            ☕ {user.email} — this order earns beans on card {memberCode}
          </p>
        ) : (
          <p className="mb-4 font-body text-xs text-cream/45">
            <a href="/login" className="text-gold-400 underline decoration-gold-400/40 underline-offset-2">Sign in</a>{" "}
            to link this order to your rewards card and earn beans.
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["dinein", "🍽️", "Dine-in", "to your table"],
              ["pickup", "🛍️", "Pickup", "grab & go"],
              ["delivery", "🛵", "Delivery", "within 4 km"],
            ] as [OrderType, string, string, string][]
          ).map(([t, icon, label, sub]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl border py-3 transition-all ${
                type === t
                  ? "scale-[1.02] border-gold-500/70 bg-gold-500/15"
                  : "border-cream/15 hover:border-gold-500/40"
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className={`mt-1 font-body text-[11px] font-bold uppercase tracking-brand ${type === t ? "text-gold-400" : "text-cream/60"}`}>
                {label}
              </span>
              <span className="font-body text-[10px] text-cream/35">{sub}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} placeholder="Phone (for order updates)" value={phone} onChange={(e) => setPhone(e.target.value)} />

          {type === "dinein" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={field} placeholder="Table number" value={table} onChange={(e) => setTable(e.target.value)} />
              <input
                className={field + " tracking-[0.3em]"}
                inputMode="numeric"
                maxLength={4}
                placeholder="Table PIN · ask your server"
                value={tablePin}
                onChange={(e) => setTablePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
              <p className="font-body text-xs text-cream/45 sm:col-span-2">
                🔒 Your server gives you a 4-digit PIN for your table — it keeps your order on the right bill.
              </p>
            </div>
          )}

          {type === "pickup" && (
            <div className="flex gap-2">
              {["ASAP", "15", "30"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPickupIn(p)}
                  className={`rounded-full px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand ${
                    pickupIn === p ? "bg-gold-500/15 text-gold-400" : "border border-cream/15 text-cream/55"
                  }`}
                >
                  {p === "ASAP" ? "ASAP" : `In ${p} min`}
                </button>
              ))}
            </div>
          )}

          {type === "delivery" && (
            <>
              <MapPicker onChange={onGeo} />
              <input className={field} placeholder="Flat / building / street" value={address} onChange={(e) => setAddress(e.target.value)} />
              <input className={field} placeholder="Landmark (optional)" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </>
          )}

          {/* coupon */}
          <div className="flex gap-2">
            <input
              className={field + " uppercase"}
              placeholder="Coupon code (try WELCOME10)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="button"
              onClick={tryCoupon}
              className="whitespace-nowrap rounded-full border border-gold-500/40 px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 transition-colors hover:border-gold-500"
            >
              Apply
            </button>
          </div>
          {/* tappable launch coupons */}
          {!coupon && (
            <div className="flex flex-wrap gap-2">
              {BUILTIN_COUPONS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={async () => {
                    setCode(c.code);
                    const r = await resolveCoupon(c.code, cart.total);
                    if (r.ok) {
                      setCoupon({ c: r.coupon, discount: r.discount });
                      setCouponMsg(`${r.coupon.code} applied — you save ${inr(r.discount)}.`);
                    } else {
                      setCoupon(null);
                      setCouponMsg(r.reason);
                    }
                  }}
                  className="rounded-full border border-dashed border-gold-500/40 px-3.5 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-gold-400/90 transition-colors hover:border-gold-500 hover:bg-gold-500/10"
                >
                  🎟 {c.code} <span className="font-normal normal-case text-cream/45">· {c.label}</span>
                </button>
              ))}
            </div>
          )}
          {couponMsg && (
            <p className={`font-body text-xs ${coupon ? "text-[#7fcb9b]" : "text-red-300"}`}>{couponMsg}</p>
          )}

          {/* payment method (UPI appears once the shop VPA is configured) */}
          {upiVpa && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod("counter")}
                aria-pressed={payMethod === "counter"}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl border py-2.5 transition-all ${
                  payMethod === "counter" ? "border-gold-500/70 bg-gold-500/15" : "border-cream/15 hover:border-gold-500/40"
                }`}
              >
                <span className={`font-body text-[11px] font-bold uppercase tracking-brand ${payMethod === "counter" ? "text-gold-400" : "text-cream/60"}`}>
                  💵 Pay at counter
                </span>
                <span className="font-body text-[10px] text-cream/35">cash · card · UPI in store</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMethod("upi")}
                aria-pressed={payMethod === "upi"}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl border py-2.5 transition-all ${
                  payMethod === "upi" ? "border-gold-500/70 bg-gold-500/15" : "border-cream/15 hover:border-gold-500/40"
                }`}
              >
                <span className={`font-body text-[11px] font-bold uppercase tracking-brand ${payMethod === "upi" ? "text-gold-400" : "text-cream/60"}`}>
                  ⚡ Pay now · UPI
                </span>
                <span className="font-body text-[10px] text-cream/35">GPay · PhonePe · any UPI app</span>
              </button>
            </div>
          )}
        </div>

        {err && <p className="mt-4 font-body text-sm text-red-300">{err}</p>}

        <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
          <button onClick={onBack} className="rounded-full border border-cream/20 px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-cream/70 hover:border-cream">
            ← Menu
          </button>
          <button
            onClick={place}
            disabled={busy}
            className="btn-sheen rounded-full bg-gold-500 px-8 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700 disabled:opacity-60"
          >
            {busy ? "Placing…" : `Place order · ${inr(payable)}`}
          </button>
        </div>
        <p className="mt-3 font-body text-xs text-cream/40 max-lg:pb-24">
          Pay at the counter{type === "delivery" ? " or on delivery (UPI/cash)" : ""} — no online payment needed today.
        </p>

        {/* mobile: sticky place-order bar (sits above the app bottom nav) */}
        <div className="rise-in safe-bottom fixed inset-x-0 bottom-[56px] z-40 border-t border-gold-500/30 bg-forest-950/95 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-3 px-5 py-3.5">
            <button onClick={onBack} className="rounded-full border border-cream/20 px-4 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-cream/70" aria-label="Back to menu">
              ←
            </button>
            <button
              onClick={place}
              disabled={busy}
              className="btn-sheen flex-1 rounded-full bg-gold-500 py-3.5 font-body text-[12px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700 disabled:opacity-60"
            >
              {busy ? "Placing…" : `Place order · ${inr(payable)}`}
            </button>
          </div>
        </div>
      </div>

      {/* cart summary */}
      <div className="h-fit rounded-sm border border-cream/10 bg-forest-850 p-6">
        <h3 className="font-display text-lg font-bold text-cream">Your order</h3>
        <div className="mt-4 space-y-3">
          {cart.lines.map((l) => {
            const isPlate = FOOD_PLATE_NAMES.includes(l.name);
            const extras = l.addons.map((a) => ADDON_LAYERS[a.name]).filter(Boolean);
            return (
              <div key={l.key} className="flex items-center justify-between gap-3 border-b border-cream/10 pb-3">
                {/* qty shows as a fan of glasses/plates: 1, 2 or 3 — then ×n */}
                <div className="relative flex shrink-0 items-end">
                  {Array.from({ length: Math.min(l.qty, 3) }).map((_, c) => (
                    <div
                      key={c}
                      className={c > 0 ? (isPlate ? "-ml-12" : "-ml-7") : ""}
                      style={{
                        zIndex: 3 - c,
                        transform: c > 0 ? `scale(${1 - c * 0.08})` : undefined,
                        transformOrigin: "bottom left",
                        opacity: 1 - c * 0.15,
                      }}
                    >
                      {isPlate ? (
                        <FoodPlate name={l.name} animKey={`${l.key}-${c}`} />
                      ) : (
                        <DrinkGlass
                          layers={ingredientsFor(l.name)}
                          extras={extras}
                          animKey={`${l.key}${extras.length}-${c}`}
                          compact
                          size={(l.size as "s" | "m" | "l") ?? "m"}
                          temp={l.temp === "hot" ? "hot" : "iced"}
                          strength={strengthFromAddons(l.addons.map((a) => a.name))}
                          sugarFree={sugarFreeFromAddons(l.addons.map((a) => a.name))}
                        />
                      )}
                    </div>
                  ))}
                  {l.qty > 3 && (
                    <span className="absolute -right-1 -top-1 z-10 rounded-full bg-gold-500 px-1.5 py-0.5 font-body text-[9px] font-bold text-forest-950">
                      ×{l.qty}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm text-cream/85">{l.name}</p>
                  <p className="font-body text-xs text-cream/45">
                    {[l.size ? SIZE_LABEL[l.size] : null, l.temp, ...l.addons.map((a) => a.name)]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {inr(l.unitPrice)}
                  </p>
                  {extras.length > 0 && (
                    <p className="mt-0.5 font-body text-[10px] text-gold-400/80">
                      + {extras.map((e) => e.name).join(", ")} poured in ↑
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <QtyBtn onClick={() => cart.setQty(l.key, l.qty - 1)}>−</QtyBtn>
                  <span className="w-5 text-center font-body text-sm tabular-nums text-cream">{l.qty}</span>
                  <QtyBtn onClick={() => cart.setQty(l.key, l.qty + 1)}>+</QtyBtn>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-1.5">
          <Row label="Subtotal" value={inr(cart.total)} />
          {discount > 0 && <Row label={`Coupon ${coupon?.c.code}`} value={`− ${inr(discount)}`} accent />}
          <div className="flex items-baseline justify-between border-t border-cream/10 pt-2">
            <span className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">To pay</span>
            <span className="font-display text-2xl font-bold text-gold-400">{inr(payable)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-body text-xs text-cream/50">{label}</span>
      <span className={`font-body text-sm ${accent ? "text-[#7fcb9b]" : "text-cream/80"}`}>{value}</span>
    </div>
  );
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 font-body text-sm text-cream/80 transition-colors hover:border-gold-500 hover:text-gold-400"
    >
      {children}
    </button>
  );
}

function Done({ code, orderId, type, memberCode, payable, method, vpa }: PlacedInfo & { vpa: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [payQr, setPayQr] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [live, setLive] = useState<{ status?: string; calledAtMs?: number } | null>(null);
  const link = vpa ? upiLink(vpa, payable, code) : "";

  // live status — when the bar calls you, this page rings and vibrates
  useEffect(() => {
    if (!db) return;
    let prevReady = false;
    return onSnapshot(doc(db, "orders", orderId), (s) => {
      const d = s.data() as { status?: string; calledAtMs?: number } | undefined;
      setLive(d ?? null);
      const nowReady = d?.status === "ready" || !!d?.calledAtMs;
      if (nowReady && !prevReady) {
        prevReady = true;
        (navigator as Navigator & { vibrate?: (p: number[]) => void }).vibrate?.([300, 100, 300, 100, 500]);
        import("@/lib/chime").then((m) => m.playChime()).catch(() => {});
      }
    });
  }, [orderId]);
  const ready = live?.status === "ready" || !!live?.calledAtMs;
  const collected = live?.status === "done";

  useEffect(() => {
    if (!memberCode) return;
    QRCode.toDataURL(memberCode, { margin: 1, width: 220, color: { dark: "#14160E", light: "#E8DFC9" } })
      .then(setQr)
      .catch(() => {});
  }, [memberCode]);

  useEffect(() => {
    if (method !== "upi" || !link) return;
    QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: "#14160E", light: "#FFFFFF" } })
      .then(setPayQr)
      .catch(() => {});
  }, [method, link]);

  async function claimPaid() {
    if (!db) return;
    try {
      await updateDoc(doc(db, "orders", orderId), {
        payment: { method: "upi", state: "claimed", claimedAt: serverTimestamp() },
      });
      setClaimed(true);
    } catch {}
  }

  return (
    <div className="max-w-3xl space-y-6">
      {ready && !collected && (
        <div className="rise-in rounded-sm border-2 border-[#3E7C5A] bg-[#3E7C5A]/20 p-6 text-center">
          <p className="font-display text-3xl font-bold text-[#7fcb9b]">🛎 {code} IS READY!</p>
          <p className="mt-1 font-body text-sm text-cream/75">
            {type === "dinein" ? "Coming to your table now." : "Please collect at the counter."}
          </p>
        </div>
      )}
      {live?.status === "pending" && (
        <div className="rounded-sm border border-gold-500/40 bg-gold-500/10 p-4 text-center">
          <p className="font-body text-sm text-gold-400">
            ☑ Your server is confirming your order — it heads to the bar the moment they approve.
          </p>
        </div>
      )}
      {method === "upi" && vpa && (
        <div className="rise-in rounded-sm border border-gold-500/40 bg-forest-900 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-[230px] flex-1">
              <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Pay now · UPI</p>
              <p className="mt-2 font-display text-4xl font-bold text-cream">{inr(payable)}</p>
              <p className="mt-1 font-body text-xs text-cream/50">
                to <span className="font-mono text-gold-400">{vpa}</span> · note: {code}
              </p>
              {!claimed ? (
                <>
                  <a
                    href={link}
                    className="btn-sheen mt-5 inline-block rounded-full bg-gold-500 px-8 py-3.5 font-body text-[12px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700"
                  >
                    Open UPI app →
                  </a>
                  <button
                    onClick={claimPaid}
                    className="mt-3 block rounded-full border border-[#3E7C5A]/60 px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-[#7fcb9b] transition-colors hover:border-[#7fcb9b]"
                  >
                    ✓ I&rsquo;ve paid
                  </button>
                  <p className="mt-2 font-body text-[11px] text-cream/40">
                    On a laptop? Scan the QR with any UPI app instead.
                  </p>
                </>
              ) : (
                <p className="mt-5 rounded-sm border border-[#3E7C5A]/50 bg-[#3E7C5A]/15 px-4 py-3 font-body text-sm text-[#7fcb9b]">
                  Payment claimed ✓ — the counter verifies it against the bank alert and marks your order paid.
                </p>
              )}
            </div>
            {payQr && !claimed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={payQr} alt={`UPI payment QR for ${inr(payable)}`} className="h-44 w-44 rounded-md bg-white p-1.5" />
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="rounded-sm border border-gold-500/30 bg-forest-900 p-8">
        <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Order placed</p>
        <h2 className="mt-2 font-display text-4xl font-bold text-gold-400">{code}</h2>
        <p className="mt-3 font-body text-cream/70">
          {type === "dinein"
            ? "We're on it — your order is headed to the bar. Quote the code if anyone asks."
            : type === "pickup"
            ? "We'll have it ready — quote this code at the counter."
            : "We'll confirm on WhatsApp and head your way. Keep your phone handy."}
        </p>
        <a href="/order" className="mt-6 inline-block rounded-full border border-gold-500/40 px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 hover:border-gold-500">
          Order more →
        </a>
      </div>

      {memberCode ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-cream/10 bg-forest-850 p-6 text-center">
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Earn your beans</p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Your Orbéan member QR" className="mt-3 h-40 w-40 rounded-sm" />
          )}
          <p className="mt-3 font-mono text-sm tracking-widest text-cream/70">{memberCode}</p>
          <p className="mt-1 font-body text-xs text-cream/40">Show this at the counter with your order.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-sm border border-cream/10 bg-forest-850 p-6 text-center">
          <p className="font-body text-sm text-cream/60">
            Want points for this order?{" "}
            <a href="/login" className="text-gold-400 underline decoration-gold-400/40 underline-offset-2">
              Sign in
            </a>{" "}
            and your rewards card QR will appear here next time.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
