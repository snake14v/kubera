"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider, firebaseEnabled, isAdmin } from "@/lib/firebase";

/** Wraps an admin area: Google sign-in + email allow-list. Renders children only for admins. */
export default function AdminGuard({
  title,
  children,
}: {
  title: string;
  children: (user: User) => React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const admin = isAdmin(user?.email);

  return (
    <main className="min-h-screen bg-forest-950">
      <header className="border-b border-cream/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="/admin" className="font-display text-lg font-bold tracking-tight text-cream">
            ORB<span className="text-gold-500">É</span>AN
            <span className="ml-2 align-middle font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">{title}</span>
          </a>
          {user && (
            <button onClick={() => auth && signOut(auth)} className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 transition-colors hover:text-gold-400">
              Sign out
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        {!firebaseEnabled ? (
          <Notice title="Firebase isn't configured yet" body="Add the NEXT_PUBLIC_FIREBASE_* env vars (see FIREBASE-SETUP.md), then redeploy." />
        ) : !ready ? (
          <p className="font-body text-cream/50">Loading…</p>
        ) : !user ? (
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-bold text-cream">Admin sign-in</h1>
            <p className="mt-3 font-body text-cream/60">Sign in with an approved Google account.</p>
            <button onClick={() => auth && signInWithPopup(auth, googleProvider).catch(() => {})} className="mt-6 inline-flex items-center gap-3 rounded-full bg-cream px-6 py-3 font-body text-sm font-bold text-forest-950 transition-opacity hover:opacity-90">
              <GoogleGlyph /> Sign in with Google
            </button>
          </div>
        ) : !admin ? (
          <Notice title="Not authorised" body={`${user.email} isn't on the admin allow-list (NEXT_PUBLIC_ADMIN_EMAILS).`} />
        ) : (
          children(user)
        )}
      </div>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl rounded-sm border border-gold-500/30 bg-forest-900 p-7">
      <h1 className="font-display text-2xl font-bold text-cream">{title}</h1>
      <p className="mt-3 font-body text-cream/65">{body}</p>
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
