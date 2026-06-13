import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import Story from "@/components/Story";
import Sourcing from "@/components/Sourcing";
import Reveal from "@/components/Reveal";
import { Eyebrow } from "@/components/ui";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Our Story — ${BRAND.business.name}`,
  description: `Why ${BRAND.business.name} exists — a premium coffee & juice house in your neighbourhood. Ceremonial-grade matcha, single-origin coffee, and a room built to linger.`,
};

const values = [
  { title: "Craft over convenience", note: "Every cup made to order. No shortcuts you can taste.", accent: "#E0A23C" },
  { title: "Natural, always", note: "Real ingredients, real colour. The butterfly pea is the blue; the matcha is the green.", accent: "#8FB573" },
  { title: "A place, not a pit stop", note: "Built for the long sit — soft light, power at every seat, no rush.", accent: "#8B9DE0" },
];

export default function AboutPage() {
  return (
    <main>
      <Nav />
      <PageHeader
        eyebrow="Our Story"
        title={<>Elevating moments, <span className="rgb-text">naturally.</span></>}
        intro={`${BRAND.business.name} is a premium coffee & juice house opening in your neighbourhood — a hundred metres from the ordinary, and built to feel like nothing near it.`}
        image="/menu-matcha.jpg"
      />

      <Story />
      <Sourcing />

      <section className="border-t border-cream/10 bg-forest-950 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>What we stand for</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              Three things we don&rsquo;t compromise on.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.07}>
                <div className="group relative h-full overflow-hidden rounded-sm border border-cream/10 bg-forest-850 p-6 transition-transform duration-300 hover:-translate-y-1">
                  <span className="absolute inset-x-0 top-0 h-0.5 opacity-60 transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundColor: v.accent }} />
                  <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25" style={{ backgroundColor: v.accent }} />
                  <h3 className="relative font-display text-xl font-bold text-cream">{v.title}</h3>
                  <p className="relative mt-3 font-body text-cream/65">{v.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <a
              href="/#waitlist"
              className="mt-12 inline-block rounded-full bg-gold-500 px-7 py-3.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700"
            >
              Join the waitlist →
            </a>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
