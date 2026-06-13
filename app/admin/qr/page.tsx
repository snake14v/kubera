"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { BRAND } from "@/lib/brand";

const SITE = BRAND.business.url; // set NEXT_PUBLIC_SITE_URL; falls back to localhost

export default function QrAdmin() {
  return <AdminGuard title="Table QRs">{() => <QrInner />}</AdminGuard>;
}

function QrInner() {
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState<{ table: number; url: string; dataUrl: string }[]>([]);

  useEffect(() => {
    (async () => {
      // QR just identifies the table; security is the per-sitting PIN the
      // waiter issues (Staff → Tables) and the guest types at checkout.
      const out = [] as { table: number; url: string; dataUrl: string }[];
      for (let t = 1; t <= count; t++) {
        const url = `${SITE}/order?table=${t}`;
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: 360,
          color: { dark: "#14160E", light: "#E8DFC9" },
        });
        out.push({ table: t, url, dataUrl });
      }
      setCodes(out);
    })();
  }, [count]);

  return (
    <div>
      <AdminNav active="qr" />

      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold text-cream">Table QR codes</h1>
          <p className="mt-1 max-w-xl font-body text-cream/55">
            Each QR opens <span className="font-mono text-gold-400">/order?table=N</span>. To order to the
            table the guest must type the <span className="text-gold-400">PIN your waiter issues</span> in
            Staff&nbsp;→&nbsp;Tables — so retyping the URL can&rsquo;t bill another table. Print, trim, laminate.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">Tables</label>
          <input
            type="number" min={1} max={40} value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
            className="w-20 rounded-full border border-cream/15 bg-forest-850 px-4 py-2 font-body text-sm text-cream outline-none focus:border-gold-500"
          />
          <button onClick={() => window.print()} className="rounded-full bg-gold-500 px-6 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700">
            Print all
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-2">
        {codes.map((c) => (
          <div key={c.table} className="rounded-sm border border-cream/10 bg-[#E8DFC9] p-4 text-center print:break-inside-avoid print:border-black/20">
            <p className="font-display text-lg font-bold text-[#14160E]">
              ORB<span className="text-[#8F4A22]">É</span>AN
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.dataUrl} alt={`QR for table ${c.table}`} className="mx-auto mt-2 w-full max-w-[220px]" />
            <p className="mt-2 font-body text-[11px] font-bold uppercase tracking-brand text-[#14160E]/70">
              Scan · order · sip
            </p>
            <p className="font-display text-2xl font-bold text-[#14160E]">Table {c.table}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
