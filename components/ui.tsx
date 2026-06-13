import Reveal from "./Reveal";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">
      {children}
    </p>
  );
}

/** Section shell: consistent vertical rhythm + centered max-width container. */
export function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`py-20 sm:py-24 lg:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

/** Eyebrow + heading + optional intro, revealed together. */
export function SectionHead({
  eyebrow,
  title,
  intro,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {intro && (
        <p className="mt-5 max-w-2xl font-body text-lg font-light text-cream/70">
          {intro}
        </p>
      )}
    </Reveal>
  );
}

/** Thin gold hairline divider — the Orbéan section marker. */
export function GoldRule() {
  return <div className="mx-auto h-px w-16 bg-gold-500/50" />;
}
