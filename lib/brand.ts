// ─────────────────────────────────────────────────────────────────────────
// KUBERA · single source of truth for ALL branding.
//
// Rebrand the entire product by editing THIS file (or the matching env vars).
// • The open-source project is "Kubera" (BRAND.name / .repo / .site).
// • The commercial hardware line is "ShopSense" (BRAND.hardware) — the part
//   you sell; the software is free & AGPL-3.0.
// • Everything a DEPLOYER personalises for their own shop (café name, address,
//   phone, socials, currency) lives under BRAND.business and is env-overridable
//   so a fork needs zero code edits — just a .env.local. See .env.local.example.
// ─────────────────────────────────────────────────────────────────────────

const env = (k: string, fallback = ""): string => {
  const v = typeof process !== "undefined" ? process.env[k] : undefined;
  return v && String(v).trim() ? String(v).trim() : fallback;
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
    currency: env("NEXT_PUBLIC_CURRENCY", "₹"),
    opening: env("NEXT_PUBLIC_OPENING", ""), // e.g. "Opening 1 Jan 2027" — blank hides it
  },
} as const;

export type Brand = typeof BRAND;
