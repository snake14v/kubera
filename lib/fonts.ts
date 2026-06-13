import { Bricolage_Grotesque, Inter, Italiana } from "next/font/google";

// Display / headings / UI workhorse (dsln used Space Grotesk; Orbéan uses Bricolage)
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

// Body — dsln's exact choice, kept
export const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Elegant serif — used for the one signed founder pull-quote only
export const serif = Italiana({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
  display: "swap",
});
