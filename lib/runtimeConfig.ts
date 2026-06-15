// Per-device runtime configuration.
//
// Lets a SINGLE generic Kubera build be configured by each shop at first run,
// with no rebuild: the /setup wizard writes the shop's Firebase web config +
// admin emails to localStorage, and lib/firebaseConfig.ts reads them at startup.
// Build-time NEXT_PUBLIC_FIREBASE_* env always wins (the "set up once / deploy"
// path); this is the fallback for the distributable app.
//
// Browser-only: every accessor guards `typeof window` so it is safe to import
// on the server (SSR), where it simply yields nothing.

export const LS_FIREBASE = "kubera.firebaseConfig";
export const LS_ADMINS = "kubera.adminEmails";
export const LS_SETUP_SKIPPED = "kubera.setupSkipped";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const isBrowser = (): boolean => typeof window !== "undefined";

export function readStoredFirebase(): Partial<FirebaseWebConfig> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LS_FIREBASE);
    return raw ? (JSON.parse(raw) as Partial<FirebaseWebConfig>) : null;
  } catch {
    return null;
  }
}

export function writeStoredFirebase(cfg: FirebaseWebConfig): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LS_FIREBASE, JSON.stringify(cfg));
}

export function readStoredAdmins(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LS_ADMINS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredAdmins(emails: string[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LS_ADMINS, JSON.stringify(emails));
}

export function markSetupSkipped(): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LS_SETUP_SKIPPED, "1");
}

export function isSetupSkipped(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(LS_SETUP_SKIPPED) === "1";
}

/** Wipe per-device config (used by the wizard's "disconnect / reset"). */
export function clearStoredConfig(): void {
  if (!isBrowser()) return;
  [LS_FIREBASE, LS_ADMINS, LS_SETUP_SKIPPED].forEach((k) => window.localStorage.removeItem(k));
}

/** Parse a pasted Firebase `firebaseConfig = { … }` snippet into the 6 fields. */
export function parseFirebaseConfigBlock(text: string): FirebaseWebConfig {
  const grab = (k: string) => (text.match(new RegExp(`${k}\\s*:\\s*["']([^"']+)["']`)) || [])[1] || "";
  return {
    apiKey: grab("apiKey"),
    authDomain: grab("authDomain"),
    projectId: grab("projectId"),
    storageBucket: grab("storageBucket"),
    messagingSenderId: grab("messagingSenderId"),
    appId: grab("appId"),
  };
}

/** Minimum viable config — the same gate lib/firebaseConfig.ts uses. */
export function isCompleteFirebase(c: Partial<FirebaseWebConfig> | null | undefined): boolean {
  return !!(c && c.apiKey && c.projectId);
}
