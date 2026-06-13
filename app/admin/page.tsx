"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { auth, db, googleProvider, firebaseEnabled, isAdmin } from "@/lib/firebase";
import AdminNav from "@/components/AdminNav";

type Signup = { id: string; email: string; createdAt: Date | null; source?: string };

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<Signup[] | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  const admin = isAdmin(user?.email);

  useEffect(() => {
    if (!admin || !db) return;
    setLoadingRows(true);
    setError("");
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "waitlist"), orderBy("createdAt", "desc")));
        setRows(
          snap.docs.map((d) => {
            const data = d.data() as { email?: string; createdAt?: Timestamp; source?: string };
            return {
              id: d.id,
              email: data.email ?? "",
              createdAt: data.createdAt?.toDate?.() ?? null,
              source: data.source,
            };
          })
        );
      } catch (e) {
        setError(
          "Couldn't load signups. Check that your Firestore rules allow this admin email to read the waitlist collection."
        );
      } finally {
        setLoadingRows(false);
      }
    })();
  }, [admin]);

  function exportCsv() {
    if (!rows) return;
    const header = "email,date,source\n";
    const body = rows
      .map((r) => `${r.email},${r.createdAt ? r.createdAt.toISOString() : ""},${r.source ?? ""}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbean-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-forest-950">
      <header className="border-b border-cream/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <span className="font-display text-lg font-bold tracking-tight text-cream">
            ORB<span className="text-gold-500">É</span>AN
            <span className="ml-2 align-middle font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">
              Admin
            </span>
          </span>
          {user && (
            <button
              onClick={() => auth && signOut(auth)}
              className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 transition-colors hover:text-gold-400"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        {!firebaseEnabled ? (
          <Notice
            title="Firebase isn't configured yet"
            body="Add the NEXT_PUBLIC_FIREBASE_* environment variables (see FIREBASE-SETUP.md), then redeploy. Until then, the dashboard can't sign you in."
          />
        ) : !authReady ? (
          <p className="font-body text-cream/50">Loading…</p>
        ) : !user ? (
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-bold text-cream">Admin sign-in</h1>
            <p className="mt-3 font-body text-cream/60">
              Sign in with the Google account on the admin allow-list to view waitlist signups.
            </p>
            <button
              onClick={() => auth && signInWithPopup(auth, googleProvider).catch(() => {})}
              className="mt-6 inline-flex items-center gap-3 rounded-full bg-cream px-6 py-3 font-body text-sm font-bold text-forest-950 transition-opacity hover:opacity-90"
            >
              <GoogleGlyph />
              Sign in with Google
            </button>
          </div>
        ) : !admin ? (
          <Notice
            title="Not authorised"
            body={`${user.email} isn't on the admin allow-list. Sign out and use an approved account, or add this email to NEXT_PUBLIC_ADMIN_EMAILS and your Firestore rules.`}
          />
        ) : (
          <>
            <AdminNav active="waitlist" />
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-cream">Waitlist</h1>
                <p className="mt-1 font-body text-cream/55">
                  {rows ? `${rows.length} signup${rows.length === 1 ? "" : "s"}` : "Loading…"}
                </p>
              </div>
              <button
                onClick={exportCsv}
                disabled={!rows || rows.length === 0}
                className="rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>

            {error && <p className="mt-6 font-body text-sm text-red-300">{error}</p>}

            <div className="mt-8 overflow-hidden rounded-sm border border-cream/10">
              <table className="w-full text-left font-body text-sm">
                <thead className="bg-forest-850 text-[11px] uppercase tracking-brand text-cream/45">
                  <tr>
                    <th className="px-5 py-3 font-bold">Email</th>
                    <th className="px-5 py-3 font-bold">Joined</th>
                    <th className="px-5 py-3 font-bold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRows && (
                    <tr><td className="px-5 py-4 text-cream/50" colSpan={3}>Loading signups…</td></tr>
                  )}
                  {rows && rows.length === 0 && !loadingRows && (
                    <tr><td className="px-5 py-4 text-cream/50" colSpan={3}>No signups yet.</td></tr>
                  )}
                  {rows?.map((r) => (
                    <tr key={r.id} className="border-t border-cream/10">
                      <td className="px-5 py-3 text-cream/90">{r.email}</td>
                      <td className="px-5 py-3 text-cream/60">{fmt(r.createdAt)}</td>
                      <td className="px-5 py-3 text-cream/45">{r.source ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
