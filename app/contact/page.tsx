import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import { Eyebrow } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import {
  ADDRESS_LINE1,
  ADDRESS_LINE2,
  PHONE_PRIMARY,
  PHONE_SECONDARY,
  EMAIL,
  OPENING,
  MAPS_EMBED,
  MAPS_LINK,
  waLink,
} from "@/lib/contact";

export const metadata: Metadata = {
  title: `Contact & Visit — ${BRAND.business.name}`,
  description: `Find ${BRAND.business.name}. Address, hours, WhatsApp, and an enquiry form.`,
};

export default function ContactPage() {
  return (
    <main>
      <Nav />
      <PageHeader
        eyebrow="Contact & Visit"
        title={<>Say <span className="rgb-text">hello.</span></>}
        intro="Questions, bulk orders, press, or just a hello — reach us however's easiest. Fastest reply is on WhatsApp."
        image="/space-3.jpg"
      />

      <section className="bg-forest-950 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
          {/* Details + form */}
          <div>
            <Reveal>
              <Eyebrow>Details</Eyebrow>
              <dl className="mt-5 space-y-5">
                <div>
                  <dt className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">Address</dt>
                  <dd className="mt-1 font-body text-cream/85">
                    {ADDRESS_LINE1}
                    <br />
                    {ADDRESS_LINE2}
                  </dd>
                </div>
                <div>
                  <dt className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">Phone</dt>
                  <dd className="mt-1 font-body text-cream/85">
                    {PHONE_PRIMARY} · {PHONE_SECONDARY}
                  </dd>
                </div>
                <div>
                  <dt className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">Email</dt>
                  <dd className="mt-1 font-body text-cream/85">
                    <a href={`mailto:${EMAIL}`} className="hover:text-gold-400">{EMAIL}</a>
                  </dd>
                </div>
                {OPENING && (
                  <div>
                    <dt className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">Opening</dt>
                    <dd className="mt-1 font-body text-gold-400">{OPENING}</dd>
                  </div>
                )}
              </dl>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={waLink(`Hi ${BRAND.business.name}, `)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#1FA855] px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-white transition-colors hover:bg-[#178043]"
                >
                  WhatsApp us
                </a>
                <a href={MAPS_LINK} target="_blank" rel="noopener noreferrer" className="rounded-full border border-gold-500/40 px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 transition-colors hover:border-gold-500">
                  Get directions →
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h2 className="mt-12 font-display text-2xl font-bold text-cream">Send a message</h2>
              <div className="mt-4">
                <ContactForm />
              </div>
            </Reveal>
          </div>

          {/* Map */}
          <Reveal delay={0.05}>
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-sm border border-cream/10 bg-forest-850">
              <a
                href={MAPS_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">
                  Find us on the map
                </span>
                <span className="font-body text-sm text-cream/60">Open in Google Maps →</span>
              </a>
              <iframe
                title={`${BRAND.business.name} location`}
                src={MAPS_EMBED}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="relative h-full min-h-[360px] w-full grayscale-[0.2]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
