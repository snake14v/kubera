import type { Config } from "tailwindcss";

// Theme tokens are CSS-variable driven so a deployer can recolour the entire UI
// from BRAND.theme / NEXT_PUBLIC_COLOR_* env (injected as :root vars in
// app/layout.tsx) — no code edits. Fallback defaults live in app/globals.css so
// the palette renders even before the runtime vars are applied.
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: rgb("--c-forest-950"), // page canvas — near-black olive/forest green
          900: rgb("--c-forest-900"),
          850: rgb("--c-forest-850"), // raised surface
          800: rgb("--c-forest-800"),
        },
        gold: {
          700: rgb("--c-gold-700"),
          500: rgb("--c-gold-500"), // PRIMARY ACCENT — brand gold
          400: rgb("--c-gold-400"),
        },
        cream: rgb("--c-cream"), // primary ink on dark
        emerald: { 500: rgb("--c-emerald-500") },
        cRose: rgb("--c-rose"), // destructive / alert accent
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      letterSpacing: {
        brand: "0.1em", // signature micro-label tracking
      },
    },
  },
  plugins: [],
};

export default config;
