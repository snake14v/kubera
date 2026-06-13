#!/usr/bin/env node
// Kubera setup check — verifies .env.local + firestore.rules are deploy-ready.
// Exits non-zero on hard failures so it can gate CI / a pre-deploy step.
//
//   npm run check:setup

import { readFile, access } from "node:fs/promises";
import { exit, argv } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV = join(ROOT, ".env.local");
const RULES = join(ROOT, "firestore.rules");

// --require: a real deploy is imminent, so a missing/incomplete config is a hard
// failure. Without it (the CI/dev default), a missing .env.local just means
// "demo / no backend" — nothing to verify, exit clean.
const REQUIRE = new Set(argv.slice(2)).has("--require");

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const fail = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const exists = (p) => access(p).then(() => true).catch(() => false);

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

let errors = 0;
let warnings = 0;

console.log("\n☕ Kubera setup check\n");

if (!(await exists(ENV))) {
  if (REQUIRE) {
    fail(".env.local not found — run `npm run setup` before deploying.");
    exit(1);
  }
  console.log("  \x1b[2mℹ no .env.local — demo / CI mode, nothing to verify.\x1b[0m\n");
  exit(0);
}

const e = parseEnv(await readFile(ENV, "utf8"));

// Firebase (optional — blank = intentional 'no backend' demo mode). Treat the
// example's placeholder strings as unset so a demo install reads as clean.
const PLACEHOLDERS = ["your-project", "your-project.firebaseapp.com", "your-project.appspot.com", ""];
const real = (k) => (PLACEHOLDERS.includes(e[k] || "") ? "" : e[k]);
const apiKey = real("NEXT_PUBLIC_FIREBASE_API_KEY");
const projectId = real("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
if (!apiKey && !projectId) {
  warn("Firebase not configured — app runs in 'no backend' demo mode (accounts/orders/counter off).");
  warnings++;
} else if (!apiKey || !projectId) {
  fail("Firebase partially configured — need both NEXT_PUBLIC_FIREBASE_API_KEY and _PROJECT_ID (paste your full SDK config).");
  errors++;
} else {
  ok("Firebase web config present.");
}

// Admin email
const admins = (e.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);
if (admins.length === 0 || admins.includes("you@example.com")) {
  fail("NEXT_PUBLIC_ADMIN_EMAILS is unset or still you@example.com — no one can administer the app.");
  errors++;
} else {
  ok(`Admin allow-list: ${admins.join(", ")}`);
}

// firestore.rules placeholder + match
if (!(await exists(RULES))) {
  fail("firestore.rules not found.");
  errors++;
} else {
  const rules = await readFile(RULES, "utf8");
  if (rules.includes("you@example.com")) {
    fail("firestore.rules still contains you@example.com — run `npm run setup` or edit isAdmin().");
    errors++;
  } else {
    ok("firestore.rules has no you@example.com placeholder.");
  }
  // Every admin email should appear in the rules
  const missing = admins.filter((a) => a !== "you@example.com" && !rules.includes(a));
  if (admins.length && missing.length) {
    warn(`Admin email(s) not found in firestore.rules: ${missing.join(", ")} (env and rules may be out of sync).`);
    warnings++;
  } else if (admins.length && !admins.includes("you@example.com")) {
    ok("firestore.rules admin identity matches NEXT_PUBLIC_ADMIN_EMAILS.");
  }
}

// ShopSense token (prod fail-closed)
if (!e.SHOPSENSE_INGEST_TOKEN) {
  warn("SHOPSENSE_INGEST_TOKEN is blank — the ingest endpoint fails closed (503) in production.");
  warnings++;
} else {
  ok("ShopSense ingest token set.");
}

console.log("");
if (errors) {
  console.log(`\x1b[31m${errors} error(s)\x1b[0m, ${warnings} warning(s). Fix the errors before deploying.\n`);
  exit(1);
}
console.log(`\x1b[32mAll checks passed\x1b[0m${warnings ? ` (${warnings} warning(s))` : ""}. Ready to deploy.\n`);
exit(0);
