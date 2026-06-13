// Firebase (client SDK) — Auth (Google + email/password) + Firestore.
// Config comes from lib/firebaseConfig.ts (NEXT_PUBLIC_FIREBASE_* env vars).
// If the env is unset, the app runs without a backend: auth/db stay null and
// every call site already guards on that, so a fresh clone builds & renders.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { FIREBASE_CONFIG, firebaseConfigured } from "./firebaseConfig";
import { cleanEnv } from "./cleanEnv";

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

/** Comma-separated allow-list of owner/admin emails (also enforced by
 *  Firestore rules). Set NEXT_PUBLIC_ADMIN_EMAILS in your env — see
 *  .env.local.example. Empty by default so no personal account is baked in. */
export const ADMIN_EMAILS = cleanEnv(process.env.NEXT_PUBLIC_ADMIN_EMAILS)
  .split(",")
  .map((e) => cleanEnv(e).toLowerCase())
  .filter(Boolean);

export function isAdmin(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
