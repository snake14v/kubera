import Reveal from "./Reveal";
import { Eyebrow } from "./ui";

export default function Story() {
  return (
    <section id="story" className="border-t border-cream/10 bg-forest-900 py-20 sm:py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16">
        {/* Image */}
        <Reveal className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-sm border border-cream/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/story.jpg"
              alt="An Orbéan signature matcha, spotlit on a dark surface"
              className="aspect-[4/5] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-950/50 to-transparent" />
          </div>
        </Reveal>

        {/* Copy */}
        <div className="lg:col-span-7 lg:py-6">
          <Reveal>
            <Eyebrow>The Orbéan Story</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
              Sourced. Crafted. <span className="rgb-text">Poured with care.</span>
            </h2>
            <p className="mt-5 max-w-xl font-body text-lg font-light text-cream/75">
              The chain down the road made coffee convenient. We&rsquo;re here to
              make it a place you choose on purpose — ceremonial-grade matcha,
              specialty beans, and a room built to slow you down.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote className="mt-9 border-l-2 border-gold-500/60 pl-6">
              <p className="font-serif text-2xl leading-snug text-gold-400 sm:text-3xl">
                &ldquo;A good cup is a quiet agreement between the leaf, the bean,
                the water, and the hand that pours it — get one wrong and the whole
                thing falls apart. We obsess over all four.&rdquo;
              </p>
              <footer className="mt-4 font-body text-[11px] font-bold uppercase tracking-brand text-cream/50">
                — The Orbéan Team
              </footer>
            </blockquote>
          </Reveal>

          <Reveal delay={0.15}>
            <ul className="mt-9 space-y-2.5 font-body text-cream/75">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#8FB573" }} />
                Ceremonial-grade matcha, whisked to order — never a powder shortcut.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#C99B6B" }} />
                Beans from Karnataka&rsquo;s own estates — Coorg, Chikmagalur, the Nilgiris.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#E0A23C" }} />
                Handcrafted daily. What&rsquo;s in the cup is on the menu. Always.
              </li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
