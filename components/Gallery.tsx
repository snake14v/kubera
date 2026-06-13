import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import Carousel, { type Slide } from "./Carousel";

const slides: Slide[] = [
  { src: "/space-1.jpg", caption: "The brew bar, in the open" },
  { src: "/space-2.jpg", caption: "Warm light, room to linger" },
  { src: "/space-3.jpg", caption: "Power at the counter, pastries in the case" },
  { src: "/space-4.jpg", caption: "The counter, end to end" },
];

export default function Gallery() {
  return (
    <section id="the-space" className="border-t border-cream/10 bg-forest-900 py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>The Space</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl lg:text-6xl">
            Warm. Unhurried. Built to linger.
          </h2>
          <p className="mt-5 max-w-2xl font-body text-lg font-light text-cream/70">
            One floor, soft light, and power where you need it — a room designed
            for the long sit, not the quick turnover.
          </p>
        </Reveal>

        <Reveal className="mt-12" delay={0.05}>
          <Carousel slides={slides} />
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-4 font-body text-xs text-cream/40">
            Renders shown — the real thing opens 12 July 2026. Get on the list to
            see it first.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
