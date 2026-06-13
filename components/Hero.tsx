"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { BRAND } from "@/lib/brand";
import Countdown from "./Countdown";
import WaitlistForm from "./WaitlistForm";

export default function Hero() {
  const reduce = useReducedMotion();
  const rise: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: "easeOut" } },
  };

  return (
    <section
      id="home"
      className="relative flex min-h-[92vh] items-center overflow-hidden supports-[height:100svh]:min-h-[92svh]"
    >
      {/* Background — interior render (atmosphere, behind a heavy scrim) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Forest scrim + gold radial glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-forest-950/75 via-forest-950/85 to-forest-950/96" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 28% 32%, rgba(181,149,86,0.16), transparent 60%)",
        }}
      />

      {/* Content */}
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12, delayChildren: 0.05 }}
        className="relative mx-auto w-full max-w-7xl px-5 sm:px-8"
      >
        <div className="max-w-2xl py-20">
          <motion.p
            variants={rise}
            className="flex items-center gap-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-gold-500"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-500/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-500" />
            </span>
            {[
              BRAND.business.opening
                ? `Opening ${BRAND.business.opening}`
                : "Opening soon",
              BRAND.business.addressLine1,
              BRAND.business.addressLine2,
            ]
              .filter(Boolean)
              .join(" · ")}
          </motion.p>

          <motion.h1
            variants={rise}
            className="mt-6 font-display text-5xl font-bold leading-[1.04] tracking-tight text-cream sm:text-6xl lg:text-7xl"
          >
            Brewed with intention.
            <br />
            <span className="rgb-text">Built as a destination.</span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-6 max-w-xl font-body text-lg font-light text-cream/80"
          >
            A premium coffee house arriving in your neighbourhood — a world away
            from the ordinary, and nothing like it. Specialty coffee,
            ceremonial-grade matcha, and a space built to linger.
          </motion.p>

          <motion.div variants={rise} className="mt-9">
            <p className="mb-3 font-body text-[10px] font-bold uppercase tracking-brand text-cream/50">
              Doors open in
            </p>
            <Countdown />
          </motion.div>

          <motion.div variants={rise} className="mt-9">
            <WaitlistForm />
            <p className="mt-3 font-body text-xs text-cream/45">
              One message when we open. No spam, no resale. ·{" "}
              <a
                href="/order"
                className="underline decoration-cream/30 underline-offset-2 transition-colors hover:text-gold-400 hover:decoration-gold-400"
              >
                Order now →
              </a>
            </p>
          </motion.div>

          <motion.p
            variants={rise}
            className="mt-10 font-body text-[11px] uppercase tracking-brand text-cream/40"
          >
            Specialty espresso · Signature matcha · Cold-pressed juices
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
