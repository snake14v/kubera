// Firebase (client SDK) — Auth (Google + email/password) + Firestore.
// Config comes from lib/firebaseConfig.ts (NEXT_PUBLIC_FIREBASE_* env vars).
// If the env is unset, the app runs without a backend: auth/db stay null and
// every call site already guards on that, so a fresh clone builds & renders.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { FIREBASE_CONFIG, firebaseConfigured } from "./firebaseConfig";
import { cleanEnv } from "./cleanEnv";
import { readStoredAdmins } from "./runtimeConfig";

export const firebaseEnabled = firebaseConfigured;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
}

export const googleProvider = new GoogleAuthProvider();
export { app, auth, db };

/** Allow-list of owner/admin emails (also enforced by Firestore rules).
 *  Resolved from NEXT_PUBLIC_ADMIN_EMAILS (build time) OR, on the client, from
 *  per-device runtime config saved by the /setup wizard. Empty by default so no
 *  personal account is baked in. */
export const ADMIN_EMAILS = (() => {
  const fromEnv = cleanEnv(process.env.NEXT_PUBLIC_ADMIN_EMAILS)
    .split(",")
    .map((e) => cleanEnv(e).toLowerCase())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  return readStoredAdmins().map((e) => e.trim().toLowerCase()).filter(Boolean);
})();

export function isAdmin(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
