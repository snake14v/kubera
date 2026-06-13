import type { Config } from "tailwindcss";

// Orbéan brand tokens — sampled from the brand creatives (see ../04-Brand-Facts.md)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#0D0E08", // page canvas — near-black olive/forest green
          900: "#101208",
          850: "#14160E", // raised surface
          800: "#1B1E12",
        },
        gold: {
          700: "#8E652D",
          500: "#B59556", // PRIMARY ACCENT — brand gold
          400: "#D6B693",
        },
        cream: "#E8DFC9", // primary ink on dark
        emerald: { 500: "#3E7C5A" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      letterSpacing: {
        brand: "0.1em", // dsln's signature micro-label tracking
      },
    },
  },
  plugins: [],
};

export default config;
