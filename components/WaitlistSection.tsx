import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import WaitlistForm from "./WaitlistForm";

export default function WaitlistSection() {
  return (
    <section
      id="waitlist"
      className="relative border-t border-cream/10 bg-forest-950 py-24 sm:py-28 lg:py-36"
    >
      {/* soft terra/gold radial */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(181,149,86,0.12), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
        <Reveal>
          <Eyebrow>The Waitlist</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl lg:text-6xl">
            Be there on day one.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-lg font-light text-cream/75">
            The first hundred on the list get the first hundred cups — on us,
            opening week. One message when we open. No spam, no resale.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-9 flex justify-center">
            <WaitlistForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
