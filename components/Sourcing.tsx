import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import { LeafIcon, CupIcon, SparkleIcon, BadgeIcon } from "./icons";

const marks = [
  {
    icon: <LeafIcon className="h-5 w-5" />,
    title: "Ceremonial-grade matcha",
    sub: "Stone-milled, first harvest",
    accent: "#8FB573",
  },
  {
    icon: <CupIcon className="h-5 w-5" />,
    title: "Single-origin beans",
    sub: "Coorg · Chikmagalur · Nilgiris",
    accent: "#C99B6B",
  },
  {
    icon: <SparkleIcon className="h-5 w-5" />,
    title: "Handcrafted daily",
    sub: "Every cup, made to order",
    accent: "#E0A23C",
  },
  {
    icon: <BadgeIcon className="h-5 w-5" />,
    title: "Sustainable sourcing",
    sub: "Chosen, cupped, kept by us",
    accent: "#7FC8A9",
  },
];

export default function Sourcing() {
  return (
    <section className="relative overflow-hidden border-t border-cream/10 bg-forest-950 py-16 sm:py-20">
      {/* drifting colour wash */}
      <div
        aria-hidden
        className="hue-blob pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(143,181,115,0.14), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="hue-blob pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(224,162,60,0.12), transparent 70%)", animationDelay: "8s" }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>Where it comes from</Eyebrow>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-bold tracking-tight text-cream sm:text-3xl">
            Crafted, <span className="rgb-text">not compromised.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {marks.map((m, i) => (
            <Reveal key={m.title} delay={i * 0.07}>
              <div
                className="group relative h-full overflow-hidden rounded-sm border border-cream/10 bg-forest-900 p-6 transition-all duration-300 hover:-translate-y-1"
                style={{ ["--mk" as string]: m.accent }}
              >
                <span
                  className="absolute inset-x-0 top-0 h-0.5 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ backgroundColor: m.accent }}
                />
                <span
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
                  style={{ backgroundColor: m.accent }}
                />
                <div
                  className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
                  style={{ backgroundColor: m.accent + "22", color: m.accent, border: `1px solid ${m.accent}55` }}
                >
                  {m.icon}
                </div>
                <p className="relative font-display text-base font-bold text-cream transition-colors duration-300 group-hover:text-[var(--mk)]">
                  {m.title}
                </p>
                <p className="relative mt-1.5 font-body text-sm text-cream/55">{m.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
