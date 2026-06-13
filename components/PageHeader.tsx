import Reveal from "./Reveal";
import { Eyebrow } from "./ui";

export default function PageHeader({
  eyebrow,
  title,
  intro,
  image,
  decor,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  image?: string;
  decor?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-cream/10">
      {image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-950/85 to-forest-950" />
        </>
      )}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 25% 30%, rgba(181,149,86,0.12), transparent 60%)" }}
      />
      {decor}
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-5 max-w-2xl font-body text-lg font-light text-cream/75">{intro}</p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
