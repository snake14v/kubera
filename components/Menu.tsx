"use client";

import { useState } from "react";
import Reveal from "./Reveal";
import DrinkGlass from "./DrinkGlass";
import { Eyebrow } from "./ui";
import { orderableIdFor } from "@/lib/orders";
import {
  matchaCollection,
  matchaPrices,
  signatureLattes,
  signaturePrices,
  icedSignatures,
  classicLattes,
  macchiatos,
  juices,
  addOns,
  accentFor,
  ingredientsFor,
  tasteFor,
  type Sizes,
  type PricedDrink,
} from "@/lib/menu";

function priceLine(s: Sizes) {
  return `S ₹${s.s}  ·  M ₹${s.m}  ·  L ₹${s.l}`;
}

/** Juice chips — tap to expand the composition under the chip row. */
function JuiceChips() {
  const [openJuice, setOpenJuice] = useState<string | null>(null);
  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        {juices.map((j) => {
          const accent = accentFor(j, "Cold-Pressed Juices");
          const on = openJuice === j;
          return (
            <button
              key={j}
              type="button"
              onClick={() => setOpenJuice(on ? null : j)}
              aria-expanded={on}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-body text-sm transition-all duration-300 hover:scale-105 ${on ? "scale-105" : ""}`}
              style={{ backgroundColor: accent + (on ? "33" : "1f"), border: `1px solid ${accent}${on ? "" : "66"}`, color: accent }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
              {j}
            </button>
          );
        })}
      </div>
      {openJuice && (
        <div className="mt-3 max-w-md rounded-sm border border-cream/10 bg-forest-850 p-4">
          <DrinkDetail name={openJuice} open />
        </div>
      )}
    </div>
  );
}

/** Expansion body: animated glass + composition + Order now (auto-adds). */
function DrinkDetail({ name, open }: { name: string; open: boolean }) {
  const accent = accentFor(name);
  const layers = ingredientsFor(name);
  const orderId = orderableIdFor(name);
  return (
    <div className={`expand-panel ${open ? "open" : ""}`}>
      <div>
        <div className="flex flex-wrap items-center gap-6 pt-5 sm:gap-8">
          {open && <DrinkGlass layers={layers} animKey={name} />}
          <div className="min-w-[200px] flex-1">
            {tasteFor(name) && (
              <>
                <p className="font-body text-[10px] font-bold uppercase tracking-brand" style={{ color: accent }}>
                  Tasting notes
                </p>
                <p className="mt-1.5 font-body text-sm italic leading-relaxed text-cream/70">{tasteFor(name)}</p>
              </>
            )}
            <p className="mt-4 font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">What&rsquo;s in the glass</p>
            <ul className="mt-2.5 space-y-2">
              {[...layers].reverse().map((l) => (
                <li key={l.name} className="flex items-center justify-between gap-3 font-body text-sm">
                  <span className="flex items-center gap-2.5 text-cream/80">
                    <span className="h-3 w-3 shrink-0 rounded-full border border-forest-950/40" style={{ backgroundColor: l.color }} />
                    {l.name}
                  </span>
                  <span className="tabular-nums text-cream/40">{l.pct}%</span>
                </li>
              ))}
            </ul>
            {orderId && (
              <a
                href={`/order?add=${orderId}`}
                onClick={(e) => e.stopPropagation()}
                className="btn-sheen mt-4 inline-block rounded-full px-6 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-transform hover:scale-105"
                style={{ backgroundColor: accent }}
              >
                Order now → adds to cart
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DrinkCard({
  name,
  note,
  price,
}: {
  name: string;
  note: string;
  price?: string;
}) {
  const accent = accentFor(name);
  const [open, setOpen] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }}
      aria-expanded={open}
      className="group relative w-full cursor-pointer overflow-hidden rounded-sm border border-cream/10 bg-forest-850 p-5 text-left transition-all duration-300"
      style={{ ["--accent" as string]: accent, borderColor: open ? accent + "66" : undefined }}
    >
      {/* accent top line — always visible, brightens on hover */}
      <span
        className="absolute inset-x-0 top-0 h-0.5 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: accent }}
      />
      {/* soft accent glow on hover */}
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-baseline justify-between gap-3">
        <h4 className="flex items-center gap-2 font-display text-lg font-semibold text-cream">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          {name}
        </h4>
        <span className="flex items-center gap-2">
          {price && (
            <span className="shrink-0 rounded-full px-2.5 py-0.5 font-body text-[11px] font-bold uppercase tracking-brand" style={{ backgroundColor: accent + "22", color: accent }}>
              {price}
            </span>
          )}
          <span
            className={`text-xs transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            style={{ color: accent }}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </div>
      <p className="relative mt-2 font-body text-sm text-cream/55">{note}</p>
      <DrinkDetail name={name} open={open} />
    </div>
  );
}

function ListRow({ d, category }: { d: PricedDrink; category: string }) {
  const accent = accentFor(d.name, category);
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-cream/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-baseline justify-between gap-4 py-3.5 text-left"
      >
        <div className="flex items-baseline gap-2.5">
          <span className="relative top-[-2px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <span>
            <span className="font-display text-base font-semibold text-cream transition-colors duration-300 group-hover:text-[var(--ac)]" style={{ ["--ac" as string]: accent }}>
              {d.name}
            </span>
            <span className="ml-3 font-body text-sm text-cream/45">{d.note}</span>
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {d.prices && (
            <span className="whitespace-nowrap font-body text-sm text-gold-400">
              from ₹{d.prices.s}
            </span>
          )}
          <span className={`text-xs transition-transform duration-300 ${open ? "rotate-180" : ""}`} style={{ color: accent }} aria-hidden>▾</span>
        </span>
      </button>
      <div className="pb-1">
        <DrinkDetail name={d.name} open={open} />
      </div>
    </div>
  );
}

export default function Menu() {
  return (
    <section id="menu" className="border-t border-cream/10 bg-forest-950 py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>Signature Menu</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl lg:text-6xl">
            Crafted for the modern connoisseur.
          </h2>
          <p className="mt-5 max-w-2xl font-body text-lg font-light text-cream/70">
            A short list, done properly — ceremonial matcha, signature lattes, and
            a proper coffee bar. Every drink, hot or iced.
          </p>
          <a
            href="/order"
            className="btn-sheen mt-7 inline-block rounded-full bg-gold-500 px-8 py-3.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700"
          >
            Order now →
          </a>
        </Reveal>

        {/* ── Signature Matcha Collection ── */}
        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-sm border border-cream/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/menu-matcha.jpg"
              alt="The Orbéan Signature Matcha Collection"
              className="h-56 w-full object-cover sm:h-72 lg:h-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-8">
              <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-400">
                Experience the art of matcha
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold text-cream sm:text-3xl">
                The Signature Matcha Collection
              </h3>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matchaCollection.map((d, i) => (
            <Reveal key={d.name} delay={(i % 3) * 0.06}>
              <DrinkCard name={d.name} note={d.note} />
            </Reveal>
          ))}
          <Reveal delay={0.12}>
            <div className="flex h-full flex-col justify-center rounded-sm border border-gold-500/30 bg-forest-900 p-5">
              <p className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/50">
                All sizes · hot or iced
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-gold-400">
                {priceLine(matchaPrices)}
              </p>
            </div>
          </Reveal>
        </div>

        {/* ── Signature Lattes ── */}
        <Reveal className="mt-16">
          <h3 className="font-display text-2xl font-bold text-cream sm:text-3xl">
            Signature Lattes
          </h3>
          <p className="mt-1 font-body text-sm text-cream/50">
            Handcrafted house specialities · {priceLine(signaturePrices)}
          </p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signatureLattes.map((d, i) => (
            <Reveal key={d.name} delay={(i % 4) * 0.05}>
              <DrinkCard name={d.name} note={d.note} />
            </Reveal>
          ))}
        </div>

        {/* ── Seasonal iced heroes ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {icedSignatures.map((d, i) => (
            <Reveal key={d.name} delay={i * 0.06}>
              <DrinkCard name={d.name} note={d.note} price="Seasonal" />
            </Reveal>
          ))}
        </div>

        {/* ── Classic + Macchiato lists ── */}
        <div className="mt-16 grid gap-x-14 gap-y-12 lg:grid-cols-2">
          <Reveal>
            <h3 className="font-display text-2xl font-bold text-cream">
              Classic &amp; Flavoured Lattes
            </h3>
            <div className="mt-4 border-b border-cream/10">
              {classicLattes.map((d) => (
                <ListRow key={d.name} d={d} category="Classic Lattes" />
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h3 className="font-display text-2xl font-bold text-cream">
              Macchiato Collection
            </h3>
            <div className="mt-4 border-b border-cream/10">
              {macchiatos.map((d) => (
                <ListRow key={d.name} d={d} category="Macchiatos" />
              ))}
            </div>
          </Reveal>
        </div>

        {/* ── Juices + add-ons ── */}
        <div className="mt-14 grid gap-x-14 gap-y-10 lg:grid-cols-2">
          <Reveal>
            <h3 className="font-display text-xl font-bold text-cream">
              Cold-Pressed Juices
            </h3>
            <p className="mt-1 font-body text-sm text-cream/50">
              Juice up — seasonal, pressed daily.
            </p>
            <JuiceChips />
          </Reveal>
          <Reveal delay={0.08}>
            <h3 className="font-display text-xl font-bold text-cream">
              Customise your cup
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-x-8">
              {addOns.map((a) => (
                <div
                  key={a.name}
                  className="flex items-baseline justify-between gap-3 border-b border-cream/10 py-2.5"
                >
                  <span className="font-body text-sm text-cream/75">{a.name}</span>
                  <span className="font-body text-sm text-gold-400">+₹{a.price}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <p className="mt-12 font-body text-xs text-cream/40">
          Online ordering is live — dine-in, pickup and local delivery.{" "}
          <a href="/order" className="text-gold-400 underline decoration-gold-400/40 underline-offset-2 hover:decoration-gold-400">
            Order now →
          </a>
        </p>
      </div>
    </section>
  );
}
