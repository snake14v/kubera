"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, firebaseEnabled } from "@/lib/firebase";
import { useMounted } from "@/lib/useMounted";

type Mode = "signin" | "register" | "reset";

const field =
  "w-full rounded-full border border-cream/15 bg-forest-850/80 px-5 py-3 font-body text-sm text-cream outline-none transition-colors placeholder:text-cream/40 focus:border-gold-500";

function friendly(code: string): string {
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "Email or password doesn't match. Try again, or reset your password.";
  if (code.includes("email-already-in-use")) return "That email already has an account — sign in instead.";
  if (code.includes("weak-password")) return "Password needs at least 6 characters.";
  if (code.includes("invalid-email")) return "That doesn't look like a valid email.";
  if (code.includes("too-many-requests")) return "Too many tries — wait a minute and try again.";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return "Google sign-in was closed before finishing.";
  if (code.includes("unauthorized-domain")) return "This site isn't authorised for Google sign-in yet.";
  if (code.includes("operation-not-allowed")) return "Google sign-in isn't enabled for this project.";
  if (code.includes("network-request-failed")) return "Network problem — check your connection and retry.";
  return "Something went wrong. Please try again.";
}

// popup blocked / not supported (e.g. mobile, embedded webviews) → fall back to a redirect
function shouldRedirect(code: string) {
  return (
    code.includes("popup-blocked") ||
    code.includes("cancelled-popup-request") ||
    code.includes("operation-not-supported") ||
    code.includes("web-storage-unsupported")
  );
}

export default function AuthPanel({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  // Complete any redirect-based Google sign-in when we land back on the page.
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) onDone?.();
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : String(e);
        // eslint-disable-next-line no-console
        console.error("[auth] redirect result error:", code);
        setMsg({ kind: "error", text: friendly(code) });
      });
  }, [onDone]);

  const mounted = useMounted();
  if (!mounted) return null;

  if (!firebaseEnabled) {
    return (
      <div className="max-w-md rounded-sm border border-gold-500/30 bg-forest-900 p-7">
        <h2 className="font-display text-2xl font-bold text-cream">Sign-in is being set up</h2>
        <p className="mt-3 font-body text-cream/65">
          Accounts go live shortly — join the waitlist meanwhile and we&rsquo;ll save you a spot.
        </p>
      </div>
    );
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      const code = e instanceof Error ? e.message : String(e);
      setMsg({ kind: "error", text: friendly(code) });
    } finally {
      setBusy(false);
    }
  }

  const google = () =>
    run(async () => {
      if (!auth) return;
      try {
        await signInWithPopup(auth, googleProvider);
        onDone?.();
      } catch (e) {
        const code = e instanceof Error ? e.message : String(e);
        // eslint-disable-next-line no-console
        console.error("[auth] google popup error:", code);
        if (shouldRedirect(code)) {
          await signInWithRedirect(auth, googleProvider); // navigates away; resolves on return
          return;
        }
        throw e;
      }
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin")
      return run(async () => {
        if (!auth) return;
        await signInWithEmailAndPassword(auth, email, password);
        onDone?.();
      });
    if (mode === "register")
      return run(async () => {
        if (!auth) return;
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
        onDone?.();
      });
    return run(async () => {
      if (!auth) return;
      await sendPasswordResetEmail(auth, email);
      setMsg({ kind: "ok", text: "Reset link sent — check your inbox (and spam)." });
    });
  };

  const tabs: [Mode, string][] = [
    ["signin", "Sign in"],
    ["register", "Register"],
    ["reset", "Reset"],
  ];

  return (
    <div className="w-full max-w-md">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setMsg(null);
            }}
            className={`rounded-full px-4 py-1.5 font-body text-[11px] font-bold uppercase tracking-brand transition-colors ${
              mode === m
                ? "bg-gold-500/15 text-gold-400"
                : "border border-cream/15 text-cream/55 hover:border-gold-500/50 hover:text-gold-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "register" && (
          <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" autoComplete="name" />
        )}
        <input className={field} type="email" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
        {mode !== "reset" && (
          <input
            className={field}
            type="password"
            required
            minLength={6}
            placeholder={mode === "register" ? "Choose a password (6+ characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-sheen w-full rounded-full bg-gold-500 px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700 disabled:opacity-60"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
        </button>

        {msg && (
          <p role={msg.kind === "error" ? "alert" : "status"} className={`font-body text-xs ${msg.kind === "error" ? "text-red-300" : "text-gold-400"}`}>
            {msg.text}
          </p>
        )}
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-cream/10" />
        <span className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/35">or</span>
        <span className="h-px flex-1 bg-cream/10" />
      </div>

      <button
        type="button"
        onClick={google}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-cream px-6 py-3 font-body text-sm font-bold text-forest-950 transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <GoogleGlyph />
        Continue with Google
      </button>

      {mode === "signin" && (
        <p className="mt-4 text-center font-body text-xs text-cream/40">
          Forgot your password?{" "}
          <button type="button" onClick={() => setMode("reset")} className="text-gold-400 underline decoration-gold-400/40 underline-offset-2 hover:decoration-gold-400">
            Reset it
          </button>
        </p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v7.8h12.4c-.3 2-1.6 5-4.6 7l7.1 5.5c4.3-3.9 6.8-9.7 6.8-16.2z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.6 2.3-8.8 2.3-6.4 0-11.8-3.7-13.6-8.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
