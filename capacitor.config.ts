import type { CapacitorConfig } from "@capacitor/cli";

// ─────────────────────────────────────────────────────────────────────────
// Capacitor shell config for Kubera.
//
// This file is evaluated by the Capacitor CLI in a PLAIN Node context, so it
// CANNOT import lib/brand.ts (that module relies on Next/webpack NEXT_PUBLIC_*
// inlining and would break the CLI). The BRAND values therefore live here as
// documented defaults, each overridable by env so a fork needs zero edits:
//
//   KUBERA_APP_ID   → appId   (default mirrors BRAND.author → com.oorulogix.kubera)
//   KUBERA_APP_NAME → appName (default mirrors BRAND.name   → "Kubera")
//   KUBERA_APP_URL  → server.url — the RUNNING Next.js origin the shell loads.
//   KUBERA_APP_CLEARTEXT=true → allow http:// (LAN/dev only; default https-only)
//
// Keep KUBERA_APP_ID in sync with BRAND.author, KUBERA_APP_NAME with BRAND.name.
// ─────────────────────────────────────────────────────────────────────────

const APP_ID = process.env.KUBERA_APP_ID || "com.oorulogix.kubera";
const APP_NAME = process.env.KUBERA_APP_NAME || "Kubera";

// The origin of the deployed, RUNNING Next.js server (live POST API routes +
// client Firebase, so it must be a real server — not a static export).
//   • Production:  https://your-kubera-host.example.com
//   • LAN testing: http://192.168.1.50:3000  (set KUBERA_APP_CLEARTEXT=true)
const APP_URL = process.env.KUBERA_APP_URL || "https://kubera.dev";

// Derive the host (for allowNavigation) from the configured URL.
let appHost = "kubera.dev";
try {
  appHost = new URL(APP_URL).host;
} catch {
  /* keep fallback */
}

// Allow plaintext http only when explicitly opted in (LAN / dev).
const allowCleartext = process.env.KUBERA_APP_CLEARTEXT === "true";

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: APP_NAME,
  // We load a remote URL at runtime, so webDir is only used by the (unused)
  // bundled-export alternative. "out" is where a static `next build` would write.
  webDir: "out",
  server: {
    url: APP_URL,
    androidScheme: "https",
    cleartext: allowCleartext,
    // Keep navigation to your own host INSIDE the webview; external links
    // (Instagram, WhatsApp, etc.) open in the system browser.
    allowNavigation: [appHost],
  },
  android: {
    appendUserAgent: "KuberaApp",
  },
};

export default config;
