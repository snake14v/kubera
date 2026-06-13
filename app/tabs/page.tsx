// TAB LAUNCHER — bookmark this on every counter tablet, pick its role once.
import { BRAND } from "@/lib/brand";

export const metadata = { title: `${BRAND.business.name} · Tablet launcher`, robots: { index: false } };

const TABS = [
  { href: "/cashier", title: "1 · Cashier", sub: "Takings, UPI verify, live queue", emoji: "💰", accent: "#E0A23C" },
  { href: "/cds", title: "2 · Customer Display", sub: "Faces the guest — brewing & ready", emoji: "🖥️", accent: "#7FC8A9" },
  { href: "/kds", title: "3 · Kitchen Display", sub: "Tickets, aging colours, bump", emoji: "👨‍🍳", accent: "#D24B5A" },
  { href: "/staff", title: "4 · Staff Portal", sub: "Check-in, FRMs, tables, captain board", emoji: "🧑‍🤝‍🧑", accent: "#8d76c0" },
  { href: "/admin", title: "5 · Admin", sub: "Owner console + Insights suite", emoji: "👑", accent: "#B59556" },
  { href: "/waiter", title: "6 · Waiter", sub: "Same till as cashier — floor orders", emoji: "🧑‍🍳", accent: "#7FC8A9" },
];

export default function Tabs() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-forest-950 p-8 text-cream">
      <p className="font-display text-3xl font-bold">{BRAND.business.name} <span className="text-gold-400">TABLETS</span></p>
      <p className="mt-2 font-body text-sm text-cream/50">Five tabs, one stack. Open this tablet&rsquo;s role and pin it.</p>
      <div className="mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TABS.map((t) => (
          <a key={t.href} href={t.href} className="group rounded-lg border border-cream/10 bg-forest-850 p-6 transition-all hover:-translate-y-1 hover:border-gold-500/50" style={{ borderTop: `3px solid ${t.accent}` }}>
            <span className="text-3xl">{t.emoji}</span>
            <p className="mt-2 font-display text-lg font-bold">{t.title}</p>
            <p className="mt-1 font-body text-xs text-cream/50">{t.sub}</p>
          </a>
        ))}
      </div>
      <p className="mt-8 font-body text-[10px] uppercase tracking-brand text-cream/30">Powered by OORULOGIX</p>
    </main>
  );
}
