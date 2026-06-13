#!/usr/bin/env node
// Kubera Firebase deploy — verifies your config, then publishes Firestore rules
// + indexes via the Firebase CLI. A safe wrapper around `firebase deploy`.
//
//   npm run firebase:deploy              verify + deploy rules & indexes
//   npm run firebase:deploy -- --dry-run show the plan, run nothing
//
// Requires the Firebase CLI (npm i -g firebase-tools) and `firebase login`.

import { spawnSync } from "node:child_process";
import { readFile, access, writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(argv.slice(2));
const DRY = args.has("--dry-run");

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  gold: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};
const exists = (p) => access(p).then(() => true).catch(() => false);
// node is always on PATH with no platform quirks — run it directly (no shell).
const node = (a, opts = {}) => spawnSync("node", a, { stdio: "inherit", ...opts });
// firebase resolves to firebase.cmd on Windows — run it through a shell as a
// single command string so it's found everywhere AND we avoid the DEP0190
// warning (which only fires for shell:true + an args array).
const fire = (cmdline, opts = {}) => spawnSync(cmdline, { stdio: "inherit", shell: true, ...opts });

console.log(`\n${c.gold("☕ Kubera — Firebase deploy")}${DRY ? c.dim("  (dry run)") : ""}\n`);

// 1. Gate on a complete, non-placeholder config.
console.log(c.b("1. Verifying configuration"));
const check = node([join(ROOT, "scripts", "check-setup.mjs"), "--require"]);
if (check.status !== 0) {
  if (DRY) {
    console.log(c.gold("\n  (dry run) config check failed — fix it before a real deploy.\n"));
  } else {
    console.log(c.red("\n  Aborting: fix the config above, then re-run.\n"));
    exit(1);
  }
}

// 2. Ensure firebase.json references rules + indexes, and the indexes file exists.
console.log(`\n${c.b("2. Checking Firebase project files")}`);
const fbJsonPath = join(ROOT, "firebase.json");
let fbJson = { firestore: { rules: "firestore.rules", indexes: "firestore.indexes.json" } };
if (await exists(fbJsonPath)) {
  try {
    fbJson = JSON.parse(await readFile(fbJsonPath, "utf8"));
  } catch {
    console.log(c.red("  firebase.json is not valid JSON — fix it first."));
    if (!DRY) exit(1);
  }
}
fbJson.firestore = fbJson.firestore || {};
let fbChanged = false;
if (fbJson.firestore.rules !== "firestore.rules") { fbJson.firestore.rules = "firestore.rules"; fbChanged = true; }
if (fbJson.firestore.indexes !== "firestore.indexes.json") { fbJson.firestore.indexes = "firestore.indexes.json"; fbChanged = true; }
if (!(await exists(join(ROOT, "firestore.indexes.json")))) {
  if (!DRY) await writeFile(join(ROOT, "firestore.indexes.json"), JSON.stringify({ indexes: [], fieldOverrides: [] }, null, 2) + "\n");
  console.log(c.gold("  created firestore.indexes.json (empty — add composite indexes as bounded queries land)."));
}
if (fbChanged && !DRY) await writeFile(fbJsonPath, JSON.stringify(fbJson, null, 2) + "\n");
console.log(c.green("  ✓ firebase.json references rules + indexes."));

// 3. Verify the Firebase CLI is installed.
console.log(`\n${c.b("3. Checking Firebase CLI")}`);
const ver = fire("firebase --version", { stdio: "pipe", encoding: "utf8" });
if (ver.status !== 0) {
  console.log(c.red("  Firebase CLI not found."));
  console.log(c.dim("  Install:  npm install -g firebase-tools   then:  firebase login"));
  if (!DRY) exit(1);
} else {
  console.log(c.green(`  ✓ firebase-tools ${String(ver.stdout || "").trim()}`));
}

// 4. Deploy (project from .env.local if available + safe).
let project = "";
if (await exists(join(ROOT, ".env.local"))) {
  const m = (await readFile(join(ROOT, ".env.local"), "utf8")).match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)$/m);
  if (m) project = m[1].replace(/^["']|["']$/g, "").trim();
}
const useProject = project && project !== "your-project" && /^[a-z0-9-]+$/.test(project);
let cmdline = "firebase deploy --only firestore:rules,firestore:indexes";
if (useProject) cmdline += ` --project ${project}`;

console.log(`\n${c.b("4. Deploy")}`);
console.log(c.dim(`  ${cmdline}`));
if (DRY) {
  console.log(c.gold("\n  (dry run) — not executed. Drop --dry-run to deploy for real.\n"));
  exit(0);
}
const dep = fire(cmdline);
if (dep.status !== 0) {
  console.log(c.red("\n  Deploy failed (see output above). Logged in? `firebase login`. Project set?\n"));
  exit(dep.status || 1);
}
console.log(c.green("\n  ✓ Firestore rules + indexes deployed.\n"));
