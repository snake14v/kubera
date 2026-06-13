"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { fmtDateTime } from "@/lib/format";

type Signup = { id: string; email: string; createdAt: Date | null; source?: string };

export default function AdminPage() {
  return <AdminGuard title="Admin">{() => <Waitlist />}</AdminGuard>;
}

function Waitlist() {
  const [rows, setRows] = useState<Signup[] | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) return;
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
      } catch {
        setError(
          "Couldn't load signups. Check that your Firestore rules allow this admin email to read the waitlist collection."
        );
      } finally {
        setLoadingRows(false);
      }
    })();
  }, []);

  function exportCsv() {
    if (!rows) return;
    // Neutralise spreadsheet formula injection in untrusted cells.
    const safe = (c: string) => (/^[=+\-@]/.test(c) ? "'" + c : c);
    const header = "email,date,source\n";
    const body = rows
      .map((r) =>
        [safe(r.email), r.createdAt ? r.createdAt.toISOString() : "", safe(r.source ?? "")].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
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
                <td className="px-5 py-3 text-cream/60">{fmtDateTime(r.createdAt)}</td>
                <td className="px-5 py-3 text-cream/45">{r.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
