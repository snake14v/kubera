// ─────────────────────────────────────────────────────────────────────────
// KUBERA · single source of truth for ALL branding & deployer customisation.
//
// Rebrand and reconfigure the entire product by editing THIS file (or the
// matching env vars in .env.local — see .env.local.example).
// • The open-source project is "Kubera" (BRAND.name / .repo / .site).
// • The commercial hardware line is "ShopSense" (BRAND.hardware) — the part
//   you sell; the software is free & AGPL-3.0.
// • Everything a DEPLOYER personalises for their own shop (name, address,
//   phone, socials, currency, locale, geo, theme colours, feature toggles)
//   lives under BRAND.business / BRAND.theme / BRAND.features and is
//   env-overridable so a fork needs zero code edits — just a .env.local.
// ─────────────────────────────────────────────────────────────────────────

// NEXT_PUBLIC_* must be read via STATIC member access (process.env.NEXT_PUBLIC_X)
// so Next/webpack can inline them into the CLIENT bundle. Dynamic access
// (process.env[k]) is NOT inlined and silently yields undefined in the browser,
// which would make every client-rendered string fall back to its default.
const RAW: Record<string, string | undefined> = {
  NEXT_PUBLIC_REPO_URL: process.env.NEXT_PUBLIC_REPO_URL,
  NEXT_PUBLIC_PROJECT_URL: process.env.NEXT_PUBLIC_PROJECT_URL,
  NEXT_PUBLIC_AUTHOR_URL: process.env.NEXT_PUBLIC_AUTHOR_URL,
  NEXT_PUBLIC_BUSINESS_NAME: process.env.NEXT_PUBLIC_BUSINESS_NAME,
  NEXT_PUBLIC_BUSINESS_SHORT: process.env.NEXT_PUBLIC_BUSINESS_SHORT,
  NEXT_PUBLIC_BUSINESS_TAGLINE: process.env.NEXT_PUBLIC_BUSINESS_TAGLINE,
  NEXT_PUBLIC_BUSINESS_EMAIL: process.env.NEXT_PUBLIC_BUSINESS_EMAIL,
  NEXT_PUBLIC_BUSINESS_PHONE: process.env.NEXT_PUBLIC_BUSINESS_PHONE,
  NEXT_PUBLIC_BUSINESS_WHATSAPP: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP,
  NEXT_PUBLIC_BUSINESS_ADDR1: process.env.NEXT_PUBLIC_BUSINESS_ADDR1,
  NEXT_PUBLIC_BUSINESS_ADDR2: process.env.NEXT_PUBLIC_BUSINESS_ADDR2,
  NEXT_PUBLIC_BUSINESS_INSTAGRAM: process.env.NEXT_PUBLIC_BUSINESS_INSTAGRAM,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CURRENCY: process.env.NEXT_PUBLIC_CURRENCY,
  NEXT_PUBLIC_CURRENCY_CODE: process.env.NEXT_PUBLIC_CURRENCY_CODE,
  NEXT_PUBLIC_LOCALE: process.env.NEXT_PUBLIC_LOCALE,
  NEXT_PUBLIC_TIMEZONE: process.env.NEXT_PUBLIC_TIMEZONE,
  NEXT_PUBLIC_SHOP_LAT: process.env.NEXT_PUBLIC_SHOP_LAT,
  NEXT_PUBLIC_SHOP_LNG: process.env.NEXT_PUBLIC_SHOP_LNG,
  NEXT_PUBLIC_DELIVERY_RADIUS_KM: process.env.NEXT_PUBLIC_DELIVERY_RADIUS_KM,
  NEXT_PUBLIC_ORDER_PREFIX: process.env.NEXT_PUBLIC_ORDER_PREFIX,
  NEXT_PUBLIC_OPENING: process.env.NEXT_PUBLIC_OPENING,
  NEXT_PUBLIC_TABLE_COUNT: process.env.NEXT_PUBLIC_TABLE_COUNT,
  NEXT_PUBLIC_COLOR_CANVAS: process.env.NEXT_PUBLIC_COLOR_CANVAS,
  NEXT_PUBLIC_COLOR_CANVAS_900: process.env.NEXT_PUBLIC_COLOR_CANVAS_900,
  NEXT_PUBLIC_COLOR_SURFACE: process.env.NEXT_PUBLIC_COLOR_SURFACE,
  NEXT_PUBLIC_COLOR_SURFACE_800: process.env.NEXT_PUBLIC_COLOR_SURFACE_800,
  NEXT_PUBLIC_COLOR_ACCENT: process.env.NEXT_PUBLIC_COLOR_ACCENT,
  NEXT_PUBLIC_COLOR_ACCENT_DEEP: process.env.NEXT_PUBLIC_COLOR_ACCENT_DEEP,
  NEXT_PUBLIC_COLOR_ACCENT_SOFT: process.env.NEXT_PUBLIC_COLOR_ACCENT_SOFT,
  NEXT_PUBLIC_COLOR_INK: process.env.NEXT_PUBLIC_COLOR_INK,
  NEXT_PUBLIC_COLOR_EMERALD: process.env.NEXT_PUBLIC_COLOR_EMERALD,
  NEXT_PUBLIC_COLOR_ROSE: process.env.NEXT_PUBLIC_COLOR_ROSE,
  NEXT_PUBLIC_FEATURE_DELIVERY: process.env.NEXT_PUBLIC_FEATURE_DELIVERY,
  NEXT_PUBLIC_FEATURE_PICKUP: process.env.NEXT_PUBLIC_FEATURE_PICKUP,
  NEXT_PUBLIC_FEATURE_DINEIN: process.env.NEXT_PUBLIC_FEATURE_DINEIN,
  NEXT_PUBLIC_FEATURE_LOYALTY: process.env.NEXT_PUBLIC_FEATURE_LOYALTY,
  NEXT_PUBLIC_FEATURE_COLLECTIBLES: process.env.NEXT_PUBLIC_FEATURE_COLLECTIBLES,
  NEXT_PUBLIC_FEATURE_COUPONS: process.env.NEXT_PUBLIC_FEATURE_COUPONS,
  NEXT_PUBLIC_FEATURE_SHOPSENSE: process.env.NEXT_PUBLIC_FEATURE_SHOPSENSE,
};

const env = (k: string, fallback = ""): string => {
  const v = RAW[k];
  return v && String(v).trim() ? String(v).trim() : fallback;
};

const envNum = (k: string, fallback: number): number => {
  const v = env(k);
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const envBool = (k: string, fallback: boolean): boolean => {
  const v = env(k).toLowerCase();
  if (!v) return fallback;
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

export const BRAND = {
  // ── The open-source product itself ──
  name: "Kubera",
  tagline: "The open-source point of sale for cafés, restaurants & retail.",
  repo: env("NEXT_PUBLIC_REPO_URL", "https://github.com/oorulogix/kubera"),
  site: env("NEXT_PUBLIC_PROJECT_URL", "https://kubera.dev"),
  license: "AGPL-3.0",
  hardware: "ShopSense", // commercial hardware line — the monetisation arm
  // The company that built & open-sourced Kubera (and makes ShopSense).
  author: "Oorulogix",
  authorUrl: env("NEXT_PUBLIC_AUTHOR_URL", "https://oorulogix.com"),

  // ── The business DEPLOYING this POS (a café / shop). Override via env. ──
  business: {
    name: env("NEXT_PUBLIC_BUSINESS_NAME", "Demo Café"),
    shortName: env("NEXT_PUBLIC_BUSINESS_SHORT", "Demo"),
    tagline: env("NEXT_PUBLIC_BUSINESS_TAGLINE", "Great coffee, fairly priced."),
    email: env("NEXT_PUBLIC_BUSINESS_EMAIL", "hello@example.com"),
    phone: env("NEXT_PUBLIC_BUSINESS_PHONE", ""),
    whatsapp: env("NEXT_PUBLIC_BUSINESS_WHATSAPP", ""), // digits only, country code first
    addressLine1: env("NEXT_PUBLIC_BUSINESS_ADDR1", "123 Demo Street"),
    addressLine2: env("NEXT_PUBLIC_BUSINESS_ADDR2", "Your City 000000"),
    instagram: env("NEXT_PUBLIC_BUSINESS_INSTAGRAM", ""), // handle, no @
    url: env("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

    // ── Money & locale ──
    currency: env("NEXT_PUBLIC_CURRENCY", "₹"), // symbol shown in the UI
    currencyCode: env("NEXT_PUBLIC_CURRENCY_CODE", "INR"), // ISO 4217, used by Intl
    locale: env("NEXT_PUBLIC_LOCALE", "en-IN"), // number/date formatting
    timezone: env("NEXT_PUBLIC_TIMEZONE", "Asia/Kolkata"),

    // ── Storefront geo (delivery radius check + map default centre) ──
    geo: {
      lat: envNum("NEXT_PUBLIC_SHOP_LAT", 12.9145),
      lng: envNum("NEXT_PUBLIC_SHOP_LNG", 77.6101),
    },
    deliveryRadiusKm: envNum("NEXT_PUBLIC_DELIVERY_RADIUS_KM", 4),

    // ── Misc ──
    orderPrefix: env("NEXT_PUBLIC_ORDER_PREFIX", "ORD"), // short order-code prefix
    opening: env("NEXT_PUBLIC_OPENING", ""), // e.g. "Opening 1 Jan 2027" — blank hides it
    tables: envNum("NEXT_PUBLIC_TABLE_COUNT", 10), // floor-plan table count
  },

  // ── Theme palette (hex). Override any colour via env to recolour the whole
  //    UI with no code edits — values flow into CSS variables in app/layout. ──
  theme: {
    canvas: env("NEXT_PUBLIC_COLOR_CANVAS", "#0D0E08"), // page background (forest-950)
    canvas900: env("NEXT_PUBLIC_COLOR_CANVAS_900", "#101208"),
    surface: env("NEXT_PUBLIC_COLOR_SURFACE", "#14160E"), // raised surface (forest-850)
    surface800: env("NEXT_PUBLIC_COLOR_SURFACE_800", "#1B1E12"),
    accent: env("NEXT_PUBLIC_COLOR_ACCENT", "#B59556"), // primary accent (gold-500)
    accentDeep: env("NEXT_PUBLIC_COLOR_ACCENT_DEEP", "#8E652D"), // gold-700
    accentSoft: env("NEXT_PUBLIC_COLOR_ACCENT_SOFT", "#D6B693"), // gold-400
    ink: env("NEXT_PUBLIC_COLOR_INK", "#E8DFC9"), // primary text (cream)
    emerald: env("NEXT_PUBLIC_COLOR_EMERALD", "#3E7C5A"),
    rose: env("NEXT_PUBLIC_COLOR_ROSE", "#D24B5A"), // destructive/alerts (cRose)
  },

  // ── Feature toggles — switch whole surfaces/capabilities on or off. ──
  features: {
    delivery: envBool("NEXT_PUBLIC_FEATURE_DELIVERY", true),
    pickup: envBool("NEXT_PUBLIC_FEATURE_PICKUP", true),
    dineIn: envBool("NEXT_PUBLIC_FEATURE_DINEIN", true),
    loyalty: envBool("NEXT_PUBLIC_FEATURE_LOYALTY", true),
    collectibles: envBool("NEXT_PUBLIC_FEATURE_COLLECTIBLES", true),
    coupons: envBool("NEXT_PUBLIC_FEATURE_COUPONS", true),
    shopsense: envBool("NEXT_PUBLIC_FEATURE_SHOPSENSE", true),
  },
} as const;

export type Brand = typeof BRAND;

/** Convert a hex colour ("#0D0E08" / "#fff") to a space-separated RGB channel
 *  string ("13 14 8") for use in `rgb(var(--x) / <alpha-value>)` CSS vars. */
export function hexToRgbChannels(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const int = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(int)) return "0 0 0";
  // eslint-disable-next-line no-bitwise
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

/** The full set of CSS custom properties that theme the app, derived from
 *  BRAND.theme. Injected once in app/layout.tsx :root. */
export function themeCssVars(): Record<string, string> {
  const t = BRAND.theme;
  return {
    "--c-forest-950": hexToRgbChannels(t.canvas),
    "--c-forest-900": hexToRgbChannels(t.canvas900),
    "--c-forest-850": hexToRgbChannels(t.surface),
    "--c-forest-800": hexToRgbChannels(t.surface800),
    "--c-gold-700": hexToRgbChannels(t.accentDeep),
    "--c-gold-500": hexToRgbChannels(t.accent),
    "--c-gold-400": hexToRgbChannels(t.accentSoft),
    "--c-cream": hexToRgbChannels(t.ink),
    "--c-emerald-500": hexToRgbChannels(t.emerald),
    "--c-rose": hexToRgbChannels(t.rose),
  };
}
