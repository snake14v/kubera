"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "ok" | "error";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      setMsg("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMsg("");

    let ok = false;

    // 1) Store in Firestore (so it shows in the admin dashboard) — best effort.
    //    Firebase is imported dynamically so it stays out of the initial bundle.
    try {
      const { db } = await import("@/lib/firebase");
      if (db) {
        const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
        await addDoc(collection(db, "waitlist"), {
          email: email.toLowerCase(),
          createdAt: serverTimestamp(),
          source: "website",
        });
        ok = true;
      }
    } catch {
      /* fall through to email API */
    }

    // 2) Notify by email via Resend — also graceful.
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) ok = true;
    } catch {
      /* ignore */
    }

    if (ok) {
      setStatus("ok");
      setMsg("You're on the list. We'll be in touch — usually within the day.");
    } else {
      setStatus("error");
      setMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <p className="font-body text-sm text-gold-400" role="status">
        ✓ {msg}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        aria-label="Email address"
        className="flex-1 rounded-full border border-cream/15 bg-forest-850/80 px-5 py-3 font-body text-sm text-cream outline-none transition-colors placeholder:text-cream/40 focus:border-gold-500"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-sheen whitespace-nowrap rounded-full bg-gold-500 px-6 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700 disabled:opacity-60"
      >
        {status === "loading" ? "Joining…" : "Join the waitlist"}
      </button>
      {status === "error" && (
        <p className="font-body text-xs text-red-300 sm:basis-full" role="alert">
          {msg}
        </p>
      )}
    </form>
  );
}
