"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "ok" | "error";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const field =
  "w-full rounded-sm border border-cream/15 bg-forest-850/80 px-4 py-3 font-body text-sm text-cream outline-none transition-colors placeholder:text-cream/40 focus:border-gold-500";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !EMAIL_RE.test(form.email) || !form.message.trim()) {
      setStatus("error");
      setMsg("Please fill in your name, a valid email, and a message.");
      return;
    }
    setStatus("loading");
    setMsg("");
    // also store in Firestore so it shows in the admin Feedback tab (best-effort)
    try {
      const { db } = await import("@/lib/firebase");
      if (db) {
        const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
        await addDoc(collection(db, "feedback"), {
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          createdAt: serverTimestamp(),
        });
      }
    } catch {}
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Something went wrong.");
      }
      setStatus("ok");
      setMsg("Thanks — we've got your message and will reply soon.");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-sm border border-gold-500/30 bg-forest-900 p-6" role="status">
        <p className="font-display text-lg font-bold text-gold-400">Message sent ✓</p>
        <p className="mt-1 font-body text-sm text-cream/70">{msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={field} placeholder="Your name" value={form.name} onChange={set("name")} aria-label="Your name" />
      <input className={field} type="email" placeholder="your@email.com" value={form.email} onChange={set("email")} aria-label="Email" />
      <textarea className={`${field} min-h-[120px] resize-y`} placeholder="How can we help?" value={form.message} onChange={set("message")} aria-label="Message" />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-gold-500 px-7 py-3 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700 disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
      {status === "error" && (
        <p className="font-body text-xs text-red-300" role="alert">
          {msg}
        </p>
      )}
    </form>
  );
}
