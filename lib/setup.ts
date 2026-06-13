// Setup engine — the data + pure helpers behind the first-run /setup wizard.
// Kept free of React/Firebase SDK so it stays light and unit-testable.

import { BRAND } from "./brand";
import { FIREBASE_CONFIG } from "./firebaseConfig";

// Static access so Next can inline it into the client bundle (see lib/brand.ts).
const ENV_ADMIN = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").trim();

export type ConfigGroup = "Business" | "Money & locale" | "Storefront" | "Admin" | "Firebase" | "Optional";
export type FieldType = "text" | "email" | "tel" | "number" | "color";

export type ConfigField = {
  key: string; // env var name
  label: string;
  group: ConfigGroup;
  type?: FieldType;
  def?: string; // current/live value, used to pre-fill the form
  hint?: string;
  optional?: boolean;
  secret?: boolean; // server-only secret (not NEXT_PUBLIC) — never commit
};

export const GROUP_ORDER: ConfigGroup[] = [
  "Business",
  "Money & locale",
  "Storefront",
  "Admin",
  "Firebase",
  "Optional",
];

const b = BRAND.business;
const f = FIREBASE_CONFIG;

export const CONFIG_FIELDS: ConfigField[] = [
  { key: "NEXT_PUBLIC_BUSINESS_NAME", label: "Business name", group: "Business", def: b.name },
  { key: "NEXT_PUBLIC_BUSINESS_SHORT", label: "Short name", group: "Business", def: b.shortName, hint: "Used in tight spaces / app name." },
  { key: "NEXT_PUBLIC_BUSINESS_TAGLINE", label: "Tagline", group: "Business", def: b.tagline },
  { key: "NEXT_PUBLIC_BUSINESS_EMAIL", label: "Contact email", group: "Business", type: "email", def: b.email },
  { key: "NEXT_PUBLIC_BUSINESS_PHONE", label: "Phone", group: "Business", type: "tel", def: b.phone, optional: true },
  { key: "NEXT_PUBLIC_BUSINESS_ADDR1", label: "Address line 1", group: "Business", def: b.addressLine1 },
  { key: "NEXT_PUBLIC_BUSINESS_ADDR2", label: "Address line 2", group: "Business", def: b.addressLine2 },
  { key: "NEXT_PUBLIC_BUSINESS_INSTAGRAM", label: "Instagram handle", group: "Business", def: b.instagram, hint: "No @.", optional: true },
  { key: "NEXT_PUBLIC_SITE_URL", label: "Public site URL", group: "Business", def: b.url },

  { key: "NEXT_PUBLIC_CURRENCY", label: "Currency symbol", group: "Money & locale", def: b.currency },
  { key: "NEXT_PUBLIC_CURRENCY_CODE", label: "Currency code (ISO 4217)", group: "Money & locale", def: b.currencyCode },
  { key: "NEXT_PUBLIC_LOCALE", label: "Locale", group: "Money & locale", def: b.locale, hint: "e.g. en-IN, en-US, fr-FR." },
  { key: "NEXT_PUBLIC_TIMEZONE", label: "Timezone", group: "Money & locale", def: b.timezone },
  { key: "NEXT_PUBLIC_ORDER_PREFIX", label: "Order-code prefix", group: "Money & locale", def: b.orderPrefix },

  { key: "NEXT_PUBLIC_SHOP_LAT", label: "Shop latitude", group: "Storefront", type: "number", def: String(b.geo.lat) },
  { key: "NEXT_PUBLIC_SHOP_LNG", label: "Shop longitude", group: "Storefront", type: "number", def: String(b.geo.lng) },
  { key: "NEXT_PUBLIC_DELIVERY_RADIUS_KM", label: "Delivery radius (km)", group: "Storefront", type: "number", def: String(b.deliveryRadiusKm) },
  { key: "NEXT_PUBLIC_TABLE_COUNT", label: "Number of tables", group: "Storefront", type: "number", def: String(b.tables) },

  { key: "NEXT_PUBLIC_ADMIN_EMAILS", label: "Admin email(s)", group: "Admin", def: ENV_ADMIN, hint: "Comma-separate for more than one owner." },

  { key: "NEXT_PUBLIC_FIREBASE_API_KEY", label: "apiKey", group: "Firebase", def: f.apiKey },
  { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", label: "authDomain", group: "Firebase", def: f.authDomain },
  { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", label: "projectId", group: "Firebase", def: f.projectId },
  { key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", label: "storageBucket", group: "Firebase", def: f.storageBucket },
  { key: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", label: "messagingSenderId", group: "Firebase", def: f.messagingSenderId },
  { key: "NEXT_PUBLIC_FIREBASE_APP_ID", label: "appId", group: "Firebase", def: f.appId },

  { key: "RESEND_API_KEY", label: "Resend API key", group: "Optional", secret: true, optional: true, hint: "Email delivery (waitlist/contact)." },
  { key: "WAITLIST_TO", label: "Waitlist notify email", group: "Optional", type: "email", secret: true, optional: true },
  { key: "LOYVERSE_TOKEN", label: "Loyverse token", group: "Optional", secret: true, optional: true, hint: "Loyalty points feed." },
  { key: "SHOPSENSE_INGEST_TOKEN", label: "ShopSense ingest token", group: "Optional", secret: true, optional: true, hint: "Required in production." },
];

/** Build a paste-ready .env block from the user's values (only the filled-in ones). */
export function buildEnvBlock(values: Record<string, string>): string {
  const out: string[] = [];
  for (const group of GROUP_ORDER) {
    const lines = CONFIG_FIELDS.filter((fld) => fld.group === group)
      .filter((fld) => (values[fld.key] ?? "").trim())
      .map((fld) => `${fld.key}=${values[fld.key].trim()}`);
    if (lines.length) {
      out.push(`# ${group}`, ...lines, "");
    }
  }
  return out.join("\n").trim() + "\n";
}

/** Order-code prefix suggestion from a business name. */
export function orderPrefixFrom(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4) || "ORD";
}

const cleanEmails = (raw: string): string[] =>
  raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** The exact email expression to drop into firestore.rules isAdmin(). */
export function isAdminExpr(adminEmailsRaw: string): string {
  const emails = cleanEmails(adminEmailsRaw);
  if (emails.length <= 1) {
    return `request.auth.token.email == '${emails[0] || "you@example.com"}'`;
  }
  return `request.auth.token.email in [${emails.map((e) => `'${e}'`).join(", ")}]`;
}

/** The full isAdmin() function block, ready to paste into firestore.rules. */
export function adminRulesSnippet(adminEmailsRaw: string): string {
  return `function isAdmin() {\n  return request.auth != null\n         && ${isAdminExpr(adminEmailsRaw)};\n}`;
}

export type CheckStatus = "ok" | "todo" | "warn";
export type CheckState = {
  firebaseEnabled: boolean;
  adminConfigured: boolean; // NEXT_PUBLIC_ADMIN_EMAILS set & not placeholder
  signedIn: boolean;
  isCurrentAdmin: boolean;
  brandCustomized: boolean; // moved off the demo brand
};

/** Live, client-knowable readiness checks shown on the Go-live step. */
export function buildChecklist(s: CheckState): { label: string; status: CheckStatus; hint: string }[] {
  return [
    {
      label: "Brand & business configured",
      status: s.brandCustomized ? "ok" : "todo",
      hint: s.brandCustomized ? `Running as “${BRAND.business.name}”.` : "Still on the demo brand — set NEXT_PUBLIC_BUSINESS_NAME.",
    },
    {
      label: "Firebase connected",
      status: s.firebaseEnabled ? "ok" : "todo",
      hint: s.firebaseEnabled ? "Accounts, orders & the counter suite are live." : "Blank config → ‘no backend’ demo mode.",
    },
    {
      label: "Admin allow-list set",
      status: s.adminConfigured ? "ok" : "todo",
      hint: s.adminConfigured ? "NEXT_PUBLIC_ADMIN_EMAILS is set." : "Set your Google account in NEXT_PUBLIC_ADMIN_EMAILS.",
    },
    {
      label: "Signed in as an admin",
      status: !s.firebaseEnabled ? "todo" : s.signedIn ? (s.isCurrentAdmin ? "ok" : "warn") : "todo",
      hint: !s.firebaseEnabled
        ? "Connect Firebase first."
        : !s.signedIn
        ? "Sign in with Google to verify your access."
        : s.isCurrentAdmin
        ? "This account is recognised as an admin."
        : "Signed in, but this email isn’t on the admin allow-list.",
    },
  ];
}

/** Manual steps the client can't verify — shown as reminders on Go-live. */
export const MANUAL_REMINDERS: { label: string; detail: string }[] = [
  { label: "Replace you@example.com in firestore.rules", detail: "Patch isAdmin() with your admin email, then deploy: npm run firebase:deploy." },
  { label: "Enable sign-in methods", detail: "Firebase Console → Authentication → Google + Email/Password." },
  { label: "Authorise your domains", detail: "Authentication → Settings → Authorized domains → add localhost + your domain." },
  { label: "Set SHOPSENSE_INGEST_TOKEN for production", detail: "The ingest endpoint fails closed (503) if it's blank in prod." },
];

export type Surface = { path: string; name: string; audience: string; blurb: string };
export const SURFACES: Surface[] = [
  { path: "/", name: "Storefront", audience: "Customers", blurb: "Order-ahead menu, cart, dine-in / pickup / delivery." },
  { path: "/cashier", name: "Cashier POS", audience: "Counter", blurb: "Ring up sales, PIN-sign charges, print receipts." },
  { path: "/cds", name: "Customer display", audience: "Counter", blurb: "Live bill mirror + full-screen UPI QR." },
  { path: "/kds", name: "Kitchen display", audience: "Kitchen", blurb: "Ticket queue, aging bars, overdue alarm, KOT print." },
  { path: "/staff", name: "Floor & staff", audience: "Floor", blurb: "Tables, sittings, move/merge bills, staff PIN portal." },
  { path: "/admin", name: "Admin & insights", audience: "Owner", blurb: "Waitlist, orders, analytics, inventory, vendors." },
  { path: "/rewards", name: "Rewards", audience: "Customers", blurb: "Loyalty tiers + member QR." },
  { path: "/stickers", name: "Sticker studio", audience: "Counter", blurb: "Gang-print cup & collectible stickers." },
];

export type Doc = { title: string; file: string; blurb: string };
export const DOCS: Doc[] = [
  { title: "Firebase setup", file: "FIREBASE-SETUP.md", blurb: "Create the project, paste the web config, publish rules." },
  { title: "Environment reference", file: ".env.local.example", blurb: "Every NEXT_PUBLIC_* knob with sensible defaults." },
  { title: "Setup scripts", file: "scripts/README.md", blurb: "npm run setup · check:setup · firebase:deploy." },
  { title: "ShopSense", file: "SHOPSENSE-SETUP.md", blurb: "Wire the sensor nodes into owner analytics." },
  { title: "Security", file: "SECURITY.md", blurb: "The trust model + how to report an issue." },
];

export type Faq = { q: string; a: string };
export const TROUBLESHOOTING: Faq[] = [
  { q: "The counter pages say ‘Firebase isn’t configured’.", a: "You’re in ‘no backend’ demo mode. Add the NEXT_PUBLIC_FIREBASE_* values (this wizard generates them) and redeploy." },
  { q: "I signed in but I’m ‘not authorised’.", a: "Your email isn’t on the admin allow-list. Add it to NEXT_PUBLIC_ADMIN_EMAILS and to isAdmin() in firestore.rules, then redeploy the rules." },
  { q: "Customer can’t place a dine-in order.", a: "Dine-in needs the table’s secret QR key. Generate table QRs in /admin/qr; pickup & delivery don’t need one." },
  { q: "Prices/dates show the wrong currency or format.", a: "Set NEXT_PUBLIC_CURRENCY, _CURRENCY_CODE and _LOCALE — everything formats through lib/format.ts." },
  { q: "Emails (waitlist/contact) aren’t sending.", a: "Set RESEND_API_KEY (server-only). Without it the forms degrade gracefully but don’t deliver." },
];

export type SetupStep = { id: string; title: string; blurb: string };
export const SETUP_STEPS: SetupStep[] = [
  { id: "welcome", title: "Welcome", blurb: "What Kubera is & how this works." },
  { id: "brand", title: "Brand & business", blurb: "Name, currency, contact — build your .env." },
  { id: "firebase", title: "Firebase", blurb: "Connect accounts + the data store." },
  { id: "admin", title: "Admin & rules", blurb: "Set the owner account; lock the rules." },
  { id: "services", title: "Services", blurb: "Email, loyalty, ShopSense (optional)." },
  { id: "golive", title: "Go live", blurb: "Readiness checklist + your surfaces." },
];
