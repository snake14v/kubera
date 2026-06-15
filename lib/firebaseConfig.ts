// Firebase web config — resolved from NEXT_PUBLIC_FIREBASE_* env vars (build
// time) OR, on the client, from per-device runtime config saved by the /setup
// wizard (lib/runtimeConfig.ts). The env path is the "set up once / deploy"
// model; the runtime path makes ONE generic build self-configurable per shop.
//
// These values are public by design: they ship in every client bundle, so
// exposing them is expected. Security comes from Firestore rules + the Auth
// authorized-domains list, NOT from hiding this config. See FIREBASE-SETUP.md.
//
// cleanEnv() strips a stray BOM / whitespace that some tooling (notably
// `vercel env add` on Windows) prepends — that silently broke auth once.
// If neither source has config the app runs in "no backend" mode
// (firebaseConfigured is false) so a fresh clone still builds and renders.

import { cleanEnv } from "./cleanEnv";
import { readStoredFirebase } from "./runtimeConfig";

const ENV_CONFIG = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

function resolveConfig() {
  // Build-time env wins.
  if (ENV_CONFIG.apiKey && ENV_CONFIG.projectId) return ENV_CONFIG;
  // Otherwise fall back to per-device runtime config (client only; null on SSR).
  const stored = readStoredFirebase();
  if (stored && stored.apiKey && stored.projectId) {
    return { ...ENV_CONFIG, ...stored } as typeof ENV_CONFIG;
  }
  return ENV_CONFIG;
}

export const FIREBASE_CONFIG = resolveConfig();

/** True once the minimum config is present — gates Firebase init. */
export const firebaseConfigured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

/** Server-side routes use this to verify Firebase ID tokens via Identity Toolkit. */
export const FIREBASE_API_KEY = FIREBASE_CONFIG.apiKey;
