"use client";

import PageHeader from "./PageHeader";
import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import { FloatingDecor, OrbitRings } from "./Decor";
import { FeatureCard, CheckList, Steps } from "./animated";
import { CrownIcon, LeafIcon, CapIcon, RocketIcon, ChatIcon, UsersIcon, DocIcon } from "./icons";
import { motion, useReducedMotion } from "framer-motion";
import { waLink, EMAIL } from "@/lib/contact";
import { BRAND } from "@/lib/brand";

const offer = [
  { icon: <CrownIcon className="h-6 w-6" />, title: "A brand that stands out", note: "Premium, design-led and unmistakable — not another lookalike cafe.", accent: "#E0A23C" },
  { icon: <LeafIcon className="h-6 w-6" />, title: "Signature recipes", note: "Our ceremonial matcha collection, signature lattes and cold-pressed juices.", accent: "#8FB573" },
  { icon: <CapIcon className="h-6 w-6" />, title: "Training & supply", note: "Barista training, sourcing, and the playbook to run it right.", accent: "#8B9DE0" },
  { icon: <RocketIcon className="h-6 w-6" />, title: "Launch support", note: "Site, fit-out guidance and an opening that lands.", accent: "#ED6A85" },
];

const steps = [
  { icon: <ChatIcon className="h-6 w-6" />, title: "Enquire", note: "Message us your city and a bit about you." },
  { icon: <UsersIcon className="h-6 w-6" />, title: "Discovery call", note: "We talk fit, location and the numbers." },
  { icon: <DocIcon className="h-6 w-6" />, title: "Franchise pack", note: "The model, costs and the full playbook." },
  { icon: <RocketIcon className="h-6 w-6" />, title: `Open your ${BRAND.business.name}`, note: "Site, fit-out and launch support." },
];

const fit = [
  "You love hospitality and sweat the details",
  "A high-footfall spot in your city",
  "Capital to build something premium, not cut corners",
  "In it for the long pour, not a quick flip",
];

export default function FranchiseContent() {
  const reduce = useReducedMotion();
  const enquire = waLink(`Hi ${BRAND.business.name}, I'm interested in a franchise. My city / location is:`);

  return (
    <>
      <PageHeader
        eyebrow="Franchise Program"
        title={<>Bring {BRAND.business.name} <span className="rgb-text">to your city.</span></>}
        intro={`We're building ${BRAND.business.name} to travel — same craft, same standard, same gold-on-green soul. If you want to bring a premium coffee & juice house to your neighbourhood, let's talk.`}
        image="/space-2.jpg"
        decor={
          <>
            <FloatingDecor />
            <OrbitRings className="pointer-events-none absolute -right-24 -top-16 h-[440px] w-[440px] text-gold-500" />
          </>
        }
      />

      {/* What you get */}
      <section className="bg-forest-950 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>What you get</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              A business in a box — built premium.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offer.map((o, i) => (
              <FeatureCard key={o.title} icon={o.icon} title={o.title} note={o.note} index={i} accent={o.accent} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cream/10 bg-forest-900 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              From hello to grand opening.
            </h2>
          </Reveal>
          <div className="mt-12">
            <Steps steps={steps} />
          </div>
        </div>
      </section>

      {/* The right partner */}
      <section className="bg-forest-950 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>The right partner</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              Who we&rsquo;re looking for.
            </h2>
          </Reveal>
          <div className="mt-8">
            <CheckList items={fit} />
          </div>

          {/* CTA */}
          <Reveal delay={0.1}>
            <motion.div
              animate={reduce ? undefined : { boxShadow: ["0 0 0 1px rgba(181,149,86,0.25)", "0 0 36px 0 rgba(181,149,86,0.35)", "0 0 0 1px rgba(181,149,86,0.25)"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="mt-12 overflow-hidden rounded-sm border border-gold-500/30 bg-forest-900 p-8"
            >
              <h3 className="font-display text-2xl font-bold text-cream">Start the conversation.</h3>
              <p className="mt-2 max-w-xl font-body text-cream/65">
                Tell us your city and a little about you. We&rsquo;ll send the franchise pack and set up a call.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={enquire} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 rounded-full bg-[#1FA855] px-7 py-3.5 font-body text-[11px] font-bold uppercase tracking-brand text-white transition-colors hover:bg-[#178043]">
                  Enquire on WhatsApp
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </a>
                <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`${BRAND.business.name} Franchise Enquiry`)}`} className="inline-flex items-center rounded-full border border-gold-500/40 px-7 py-3.5 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 transition-colors hover:border-gold-500">
                  Email us
                </a>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
