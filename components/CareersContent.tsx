"use client";

import PageHeader from "./PageHeader";
import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import { FloatingDecor, OrbitRings } from "./Decor";
import { FeatureCard, CheckList, Steps } from "./animated";
import { CupIcon, UsersIcon, GlassIcon, BadgeIcon, ChatIcon } from "./icons";
import { motion, useReducedMotion } from "framer-motion";
import { waLink } from "@/lib/contact";
import { BRAND } from "@/lib/brand";

const roles = [
  { icon: <CupIcon className="h-6 w-6" />, title: "Baristas", note: "Specialty espresso & matcha. Training provided — passion required.", accent: "#C99B6B" },
  { icon: <UsersIcon className="h-6 w-6" />, title: "Floor Team", note: "Warm hosts who make the room feel like ours.", accent: "#8B9DE0" },
  { icon: <GlassIcon className="h-6 w-6" />, title: "Kitchen & Juice Bar", note: "Cold-pressed juices, bakes, and the small things done right.", accent: "#F2A93B" },
  { icon: <BadgeIcon className="h-6 w-6" />, title: "Shift Leads", note: "Run the bar, set the standard, grow with us.", accent: "#8FB573" },
];

const steps = [
  { icon: <ChatIcon className="h-6 w-6" />, title: "Message us", note: "Tell us who you are and the role you want." },
  { icon: <UsersIcon className="h-6 w-6" />, title: "Quick chat", note: "A relaxed conversation, in person or on call." },
  { icon: <CupIcon className="h-6 w-6" />, title: "Trial shift", note: "Get behind the bar and see if it clicks." },
];

const perks = [
  "Specialty training from day one",
  "A brand you help build from launch",
  "Real growth as we expand",
  "A team that takes the craft seriously",
];

export default function CareersContent() {
  const reduce = useReducedMotion();
  const apply = waLink(`Hi ${BRAND.business.name}, I'd like to apply for a role — here's a bit about me:`);

  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title={<>Build {BRAND.business.name} <span className="rgb-text">with us.</span></>}
        intro={`${BRAND.business.opening ? `${BRAND.business.opening}, and we're` : "We're"} assembling the founding team now. If you take coffee — and people — seriously, we'd love to meet you.`}
        image="/space-1.jpg"
        decor={
          <>
            <FloatingDecor />
            <OrbitRings className="pointer-events-none absolute -right-24 -top-16 h-[440px] w-[440px] text-gold-500" />
          </>
        }
      />

      {/* Open roles */}
      <section className="bg-forest-950 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>Open roles</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              Who we&rsquo;re looking for.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r, i) => (
              <FeatureCard key={r.title} icon={r.icon} title={r.title} note={r.note} index={i} accent={r.accent} />
            ))}
          </div>
        </div>
      </section>

      {/* How to join */}
      <section className="border-t border-cream/10 bg-forest-900 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>How to join</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              Three steps, no long forms.
            </h2>
          </Reveal>
          <div className="mt-12">
            <Steps steps={steps} />
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-forest-950 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>Why {BRAND.business.name}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              What you get from us.
            </h2>
          </Reveal>
          <div className="mt-8">
            <CheckList items={perks} />
          </div>

          {/* Apply CTA */}
          <Reveal delay={0.1}>
            <motion.div
              animate={reduce ? undefined : { boxShadow: ["0 0 0 1px rgba(181,149,86,0.25)", "0 0 36px 0 rgba(181,149,86,0.35)", "0 0 0 1px rgba(181,149,86,0.25)"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="mt-12 overflow-hidden rounded-sm border border-gold-500/30 bg-forest-900 p-8"
            >
              <h3 className="font-display text-2xl font-bold text-cream">Apply in a message.</h3>
              <p className="mt-2 max-w-xl font-body text-cream/65">
                No long forms. Tell us who you are and the role you want on WhatsApp — we read every one.
              </p>
              <a href={apply} target="_blank" rel="noopener noreferrer" className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[#1FA855] px-7 py-3.5 font-body text-[11px] font-bold uppercase tracking-brand text-white transition-colors hover:bg-[#178043]">
                Apply on WhatsApp
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
