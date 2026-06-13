#!/usr/bin/env node
// Kubera setup — fills .env.local from .env.local.example with YOUR details and
// patches firestore.rules with your admin email (the isAdmin() placeholder).
//
//   npm run setup                 interactive
//   npm run setup -- --defaults   accept all demo defaults, no prompts (CI/demo)
//   npm run setup -- --dry-run    show what would change, write nothing
//   npm run setup -- --quick      ask only the essentials (name, admin, Firebase)
//
// Cross-platform, zero extra dependencies (Node built-ins only).

import { readFile, writeFile, access, copyFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, exit, env } from "node:process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE = join(ROOT, ".env.local.example");
const ENV = join(ROOT, ".env.local");
const RULES = join(ROOT, "firestore.rules");

const args = new Set(argv.slice(2));
const DRY = args.has("--dry-run");
const DEFAULTS = args.has("--defaults");
const QUICK = args.has("--quick");
const INTERACTIVE = !DEFAULTS && stdin.isTTY;

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  gold: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

const exists = (p) => access(p).then(() => true).catch(() => false);
const slug = (s) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4) || "ORD";

let rl;
async function ask(question, def = "") {
  if (!INTERACTIVE) return def;
  const hint = def ? c.dim(` [${def}]`) : c.dim(" [blank]");
  const a = (await rl.question(`  ${question}${hint}: `)).trim();
  return a || def;
}
async function confirm(question, defYes = true) {
  if (!INTERACTIVE) return defYes;
  const a = (await rl.question(`  ${question} ${c.dim(defYes ? "[Y/n]" : "[y/N]")}: `)).trim().toLowerCase();
  if (!a) return defYes;
  return a === "y" || a === "yes";
}
async function askBlock(prompt) {
  if (!INTERACTIVE) return "";
  stdout.write(`  ${prompt}\n  ${c.dim("(paste, then an empty line to finish)")}\n`);
  const lines = [];
  while (true) {
    const line = await rl.question("  > ");
    if (line.trim() === "") break;
    lines.push(line);
  }
  return lines.join("\n");
}

// Extract the 6 web-config values from a pasted `firebaseConfig = {...}` block.
function parseFirebaseBlock(text) {
  const grab = (k) => (text.match(new RegExp(`${k}\\s*:\\s*["']([^"']+)["']`)) || [])[1] || "";
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: grab("apiKey"),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: grab("authDomain"),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: grab("projectId"),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: grab("storageBucket"),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: grab("messagingSenderId"),
    NEXT_PUBLIC_FIREBASE_APP_ID: grab("appId"),
  };
}

async function main() {
  if (!(await exists(EXAMPLE))) {
    console.error(c.red(`Missing ${EXAMPLE}. Run from the repo root.`));
    exit(1);
  }
  if (INTERACTIVE) rl = createInterface({ input: stdin, output: stdout });

  console.log(`\n${c.gold("☕ Kubera setup")} — let's fill ${c.b(".env.local")} and ${c.b("firestore.rules")} with your details.`);
  if (DRY) console.log(c.dim("   (dry run — nothing will be written)"));
  if (!INTERACTIVE && !DEFAULTS) console.log(c.dim("   (no TTY — using defaults; pass --defaults to silence this)"));

  const answers = {};
  const set = (k, v) => { if (v !== undefined && v !== null && v !== "") answers[k] = v; };

  // ── Business ──
  console.log(`\n${c.b("Your business")}`);
  const name = await ask("Business name", "Demo Café");
  set("NEXT_PUBLIC_BUSINESS_NAME", name);
  set("NEXT_PUBLIC_BUSINESS_SHORT", await ask("Short name", name.split(" ")[0] || "Demo"));
  if (!QUICK) {
    set("NEXT_PUBLIC_BUSINESS_TAGLINE", await ask("Tagline", "Great coffee, fairly priced."));
    set("NEXT_PUBLIC_BUSINESS_EMAIL", await ask("Contact email", "hello@example.com"));
    set("NEXT_PUBLIC_BUSINESS_PHONE", await ask("Phone", ""));
    set("NEXT_PUBLIC_BUSINESS_ADDR1", await ask("Address line 1", "123 Demo Street"));
    set("NEXT_PUBLIC_BUSINESS_ADDR2", await ask("Address line 2", "Your City 000000"));
    set("NEXT_PUBLIC_BUSINESS_INSTAGRAM", await ask("Instagram handle (no @)", ""));
    set("NEXT_PUBLIC_SITE_URL", await ask("Public site URL", "http://localhost:3000"));
  }

  // ── Money & locale ──
  if (!QUICK) {
    console.log(`\n${c.b("Money & locale")}`);
    set("NEXT_PUBLIC_CURRENCY", await ask("Currency symbol", "₹"));
    set("NEXT_PUBLIC_CURRENCY_CODE", await ask("Currency code (ISO 4217)", "INR"));
    set("NEXT_PUBLIC_LOCALE", await ask("Locale", "en-IN"));
    set("NEXT_PUBLIC_TIMEZONE", await ask("Timezone", "Asia/Kolkata"));
    set("NEXT_PUBLIC_ORDER_PREFIX", await ask("Order-code prefix", slug(name)));

    console.log(`\n${c.b("Storefront geo")}`);
    set("NEXT_PUBLIC_SHOP_LAT", await ask("Shop latitude", "12.9145"));
    set("NEXT_PUBLIC_SHOP_LNG", await ask("Shop longitude", "77.6101"));
    set("NEXT_PUBLIC_DELIVERY_RADIUS_KM", await ask("Delivery radius (km)", "4"));
    set("NEXT_PUBLIC_TABLE_COUNT", await ask("Number of tables", "10"));
  } else {
    set("NEXT_PUBLIC_ORDER_PREFIX", slug(name));
  }

  // ── Admin identity (also patches firestore.rules) ──
  console.log(`\n${c.b("Admin")} ${c.dim("— the Google account that signs into /admin")}`);
  const adminRaw = await ask("Admin email(s), comma-separated", "");
  const emails = adminRaw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length) {
    set("NEXT_PUBLIC_ADMIN_EMAILS", emails.join(","));
    set("WAITLIST_TO", emails[0]);
  }

  // ── Firebase web config ──
  console.log(`\n${c.b("Firebase")} ${c.dim("— Console → Project settings → Your apps → Web app → SDK config")}`);
  if (INTERACTIVE && !QUICK ? await confirm("Paste the whole firebaseConfig block?", true) : INTERACTIVE) {
    const block = await askBlock("Paste your firebaseConfig:");
    const fb = parseFirebaseBlock(block);
    for (const [k, v] of Object.entries(fb)) set(k, v);
    if (!fb.NEXT_PUBLIC_FIREBASE_API_KEY) console.log(c.dim("   (no apiKey parsed — leaving Firebase blank → 'no backend' demo mode)"));
  }

  // ── Secrets (optional) ──
  if (!QUICK) {
    console.log(`\n${c.b("Optional services")} ${c.dim("— press Enter to skip")}`);
    set("RESEND_API_KEY", await ask("Resend API key (email)", ""));
    set("LOYVERSE_TOKEN", await ask("Loyverse token (loyalty)", ""));
  }
  let token = "";
  if (await confirm("Generate a secure ShopSense ingest token?", true)) {
    token = randomBytes(24).toString("hex");
    set("SHOPSENSE_INGEST_TOKEN", token);
  }

  // ── Build .env.local from the example template (keeps comments + defaults) ──
  const exampleText = await readFile(EXAMPLE, "utf8");
  const outLines = exampleText.split(/\r?\n/).map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return m && Object.prototype.hasOwnProperty.call(answers, m[1]) ? `${m[1]}=${answers[m[1]]}` : line;
  });
  const envOut = outLines.join("\n");

  // ── Patch firestore.rules isAdmin() with the admin email(s) ──
  let rulesPatched = false;
  let rulesOut = await readFile(RULES, "utf8");
  if (emails.length) {
    const expr =
      emails.length === 1
        ? `request.auth.token.email == '${emails[0]}'`
        : `request.auth.token.email in [${emails.map((e) => `'${e}'`).join(", ")}]`;
    const next = rulesOut
      .replace(/request\.auth\.token\.email\s*(==\s*'you@example\.com'|in\s*\[[^\]]*you@example\.com[^\]]*\])/, expr)
      .replaceAll("you@example.com", emails[0]);
    rulesPatched = next !== rulesOut;
    rulesOut = next;
  }

  // ── Write (or preview) ──
  console.log(`\n${c.b("Summary")}`);
  console.log(`  • .env.local        ${Object.keys(answers).length} value(s) set${token ? `, ShopSense token generated` : ""}`);
  console.log(`  • firestore.rules   ${emails.length ? (rulesPatched ? c.green(`admin → ${emails.join(", ")}`) : "already set") : c.gold("admin NOT set (kept you@example.com — set it before deploy)")}`);

  if (DRY) {
    console.log(c.dim("\n  dry run — no files written.\n"));
    if (rl) rl.close();
    return;
  }

  if (await exists(ENV)) {
    if (await confirm(`\n  ${ENV} exists — back it up and overwrite?`, true)) {
      await copyFile(ENV, `${ENV}.bak`);
      console.log(c.dim(`  backed up → .env.local.bak`));
    } else {
      console.log(c.gold("  kept existing .env.local (skipped)."));
      if (rl) rl.close();
      return;
    }
  }
  await writeFile(ENV, envOut, "utf8");
  if (rulesPatched) await writeFile(RULES, rulesOut, "utf8");

  console.log(c.green(`\n  ✓ Wrote .env.local${rulesPatched ? " and patched firestore.rules" : ""}.`));
  console.log(`\n${c.b("Next steps")}`);
  console.log(`  1. ${c.dim("Verify:")}  npm run check:setup`);
  console.log(`  2. ${c.dim("Deploy rules:")}  firebase deploy --only firestore:rules`);
  console.log(`  3. ${c.dim("Enable Google + Email/Password sign-in and add your domain to Authorized domains (see FIREBASE-SETUP.md).")}`);
  console.log(`  4. ${c.dim("Run:")}  npm run dev\n`);
  if (token) console.log(c.dim(`  ShopSense token (burn into node firmware): ${token}\n`));
  if (rl) rl.close();
}

main().catch((e) => {
  console.error(c.red(`\nSetup failed: ${e.message}`));
  if (rl) rl.close();
  exit(1);
});
