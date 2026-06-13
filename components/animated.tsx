"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Icon card that reveals on scroll, lifts + glows on hover, with a gold top-wipe and icon spin. */
export function FeatureCard({
  icon,
  title,
  note,
  index = 0,
  accent = "#B59556",
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  index?: number;
  accent?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      whileHover={reduce ? undefined : { y: -5 }}
      className="group relative h-full overflow-hidden rounded-sm border border-cream/10 bg-forest-850 p-6 transition-colors duration-300"
      style={{ ["--fc" as string]: accent }}
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
        style={{ backgroundColor: accent }}
      />
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ backgroundColor: accent }}
      />
      <div
        className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-500 ease-out group-hover:[transform:rotate(8deg)_scale(1.1)]"
        style={{ backgroundColor: accent + "1c", color: accent, border: `1px solid ${accent}4d` }}
      >
        {icon}
      </div>
      <h3 className="relative font-display text-xl font-bold text-cream transition-colors duration-300 group-hover:text-[var(--fc)]">
        {title}
      </h3>
      <p className="relative mt-2 font-body text-sm text-cream/60">{note}</p>
    </motion.div>
  );
}

const CHECK_PALETTE = ["#8FB573", "#E0A23C", "#E58CA0", "#8B9DE0", "#7FC8A9", "#EFD35C"];

/** A list whose coloured checkmarks draw themselves in on scroll. */
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((text, i) => (
        <motion.li
          key={text}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.4 }}
          className="flex items-start gap-3 font-body text-cream/75"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" style={{ color: CHECK_PALETTE[i % CHECK_PALETTE.length] }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M4 12.5l5 5 11-12"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 + 0.1, duration: 0.5, ease: "easeOut" }}
            />
          </svg>
          <span>{text}</span>
        </motion.li>
      ))}
    </ul>
  );
}

export type Step = { icon: React.ReactNode; title: string; note: string };

/** Animated process timeline — a line grows in, then numbered step-nodes pop. */
export function Steps({ steps }: { steps: Step[] }) {
  const cols =
    steps.length >= 4 ? "sm:grid-cols-4" : steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className="relative">
      <motion.div
        aria-hidden
        className="absolute left-7 right-7 top-7 hidden h-px origin-left bg-gradient-to-r from-gold-500/50 to-gold-500/10 sm:block"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <div className={`grid gap-8 ${cols}`}>
        {steps.map((s, i) => {
          const accent = CHECK_PALETTE[i % CHECK_PALETTE.length];
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.5, ease: "easeOut" }}
              className="group relative text-center sm:text-left"
            >
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-950 transition-transform duration-500 group-hover:scale-110 sm:mx-0"
                style={{ color: accent, border: `1px solid ${accent}66`, boxShadow: `0 0 24px -8px ${accent}55` }}
              >
                {s.icon}
              </div>
              <p className="mt-4 font-body text-[11px] font-bold uppercase tracking-brand" style={{ color: accent }}>
                Step {i + 1}
              </p>
              <h4 className="mt-1 font-display text-lg font-bold text-cream">{s.title}</h4>
              <p className="mt-1 font-body text-sm text-cream/60">{s.note}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
