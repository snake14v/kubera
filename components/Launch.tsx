import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import { waLink } from "@/lib/contact";
import { BRAND } from "@/lib/brand";

const cards = [
  {
    title: "Order online",
    note: "Dine-in by table QR, pickup, or delivery within 4 km — pay at the counter or on delivery.",
    tag: "Live now",
    href: "/order",
    cta: "Order now →",
    external: false,
  },
  {
    title: "Reserve a table",
    note: "For the table by the window, plan ahead — we'll confirm on WhatsApp.",
    tag: "Live now",
    href: waLink(`Hi ${BRAND.business.name}, I'd like to reserve a table for ___ people on ___ at ___.`),
    cta: "Reserve →",
    external: true,
  },
  {
    title: "WhatsApp us",
    note: "A real person, usually within the hour.",
    tag: "Live now",
    href: waLink(`Hi ${BRAND.business.name}, I have a question —`),
    cta: "Message us →",
    external: true,
  },
];

export default function Launch() {
  return (
    <section id="order" className="border-t border-cream/10 bg-forest-900 py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>Order &amp; Reserve</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl lg:text-6xl">
            Three ways in — open for orders.
          </h2>
          <p className="mt-5 max-w-2xl font-body text-lg font-light text-cream/70">
            {BRAND.business.opening ? `${BRAND.business.opening} — ` : ""}online ordering is already live. Order to a table,
            grab-and-go, or get it delivered nearby.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.07}>
              <div className="flex h-full flex-col rounded-sm border border-cream/10 bg-forest-850 p-6 transition-colors duration-300 hover:border-gold-500/40">
                <span className="self-start rounded-full bg-[#1FA855]/15 px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-brand text-[#4ed98a]">
                  {c.tag}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-cream">{c.title}</h3>
                <p className="mt-2 flex-1 font-body text-sm text-cream/60">{c.note}</p>
                <a
                  href={c.href}
                  {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="mt-5 inline-flex items-center font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 transition-colors hover:text-gold-500"
                >
                  {c.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
