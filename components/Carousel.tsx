"use client";

import { useCallback, useEffect, useState } from "react";

export type Slide = { src: string; caption: string };

export default function Carousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  const go = useCallback((next: number) => setI((next + n) % n), [n]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((p) => (p + 1) % n), 4000);
    return () => clearInterval(id);
  }, [paused, n]);

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-cream/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/10] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
        {slides.map((s, idx) => (
          <div
            key={s.src}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: idx === i ? 1 : 0 }}
            aria-hidden={idx !== i}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={s.caption} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent" />
            <span className="absolute bottom-4 left-4 rounded-full border border-cream/15 bg-forest-950/60 px-3 py-1.5 font-body text-xs text-cream backdrop-blur-sm">
              {s.caption}
            </span>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => go(i - 1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-cream/15 bg-forest-950/60 p-2 text-cream backdrop-blur-sm transition-colors hover:border-gold-500 hover:text-gold-400"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => go(i + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-cream/15 bg-forest-950/60 p-2 text-cream backdrop-blur-sm transition-colors hover:border-gold-500 hover:text-gold-400"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        {slides.map((s, idx) => (
          <button
            key={s.src}
            type="button"
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => go(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-5 bg-gold-500" : "w-1.5 bg-cream/40 hover:bg-cream/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
