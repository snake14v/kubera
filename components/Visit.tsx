import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import { BRAND } from "@/lib/brand";
import {
  ADDRESS_LINE1,
  ADDRESS_LINE2,
  PHONE_PRIMARY,
  MAPS_EMBED,
  MAPS_LINK,
  OPENING,
  waLink,
} from "@/lib/contact";

const pill =
  "inline-flex items-center justify-center rounded-full px-5 py-3 font-body text-[11px] font-bold uppercase tracking-brand transition-colors";

export default function Visit() {
  return (
    <section id="visit" className="border-t border-cream/10 bg-forest-950 py-20 sm:py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Left — details */}
        <div>
          <Reveal>
            <Eyebrow>Visit</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
              Find us. Stay a while.
            </h2>
            <p className="mt-5 max-w-md font-body text-lg font-light text-cream/70">
              Right in your neighbourhood — a few steps from the everyday, a
              world away from it.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <dl className="mt-8 space-y-5">
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">
                  Address
                </dt>
                <dd className="mt-1 font-body text-cream/85">
                  {ADDRESS_LINE1}
                  <br />
                  {ADDRESS_LINE2}
                </dd>
              </div>
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">
                  Hours
                </dt>
                <dd className="mt-1 font-body text-cream/85">
                  Daily · 8:00 AM – 11:00 PM{" "}
                  <span className="text-cream/45">(from opening day)</span>
                </dd>
              </div>
              {BRAND.business.opening && (
                <div>
                  <dt className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">
                    Opening
                  </dt>
                  <dd className="mt-1 font-body text-gold-400">{OPENING}</dd>
                </div>
              )}
            </dl>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`tel:${PHONE_PRIMARY.replace(/\s/g, "")}`} className={`${pill} border border-cream/20 text-cream hover:border-cream`}>
                Call us
              </a>
              <a
                href={waLink(`Hi ${BRAND.business.name}, I'd like to visit — when do you open?`)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${pill} bg-[#1FA855] text-white hover:bg-[#178043]`}
              >
                WhatsApp us
              </a>
              <a href={MAPS_LINK} target="_blank" rel="noopener noreferrer" className={`${pill} border border-gold-500/40 text-gold-400 hover:border-gold-500`}>
                Get directions →
              </a>
            </div>
          </Reveal>
        </div>

        {/* Right — map */}
        <Reveal delay={0.05}>
          <div className="relative h-full min-h-[320px] overflow-hidden rounded-sm border border-cream/10 bg-forest-850">
            {/* Fallback shown if the map embed is blocked */}
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
            >
              <span className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">
                {ADDRESS_LINE1}
              </span>
              <span className="font-body text-sm text-cream/60">
                Open in Google Maps →
              </span>
            </a>
            <iframe
              title={`${BRAND.business.name} location`}
              src={MAPS_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="relative h-full min-h-[320px] w-full grayscale-[0.2]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
