"use client";

// Seamless ops navigation — one compact strip on every counter tab so
// waiter/cashier/kitchen jump between surfaces without the launcher.

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cashier", label: "💰 Till" },
  { href: "/waiter", label: "🧑‍🍳 Waiter" },
  { href: "/staff?panel=floor", label: "🔔 Live Floor", match: "/staff" },
  { href: "/kds", label: "👨‍🍳 KDS" },
  { href: "/cds", label: "🖥 CDS" },
  { href: "/staff?panel=inventory", label: "📦 Stock", match: "__never" },
  { href: "/stickers", label: "🏷 Stickers" },
  { href: "/admin", label: "👑 Admin" },
];

export default function OpsNav() {
  const path = usePathname() || "/";
  return (
    <nav className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto py-1">
      {LINKS.map((l) => {
        const on = path === (l.match ?? l.href.split("?")[0]);
        return (
          <a
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3.5 py-2 font-body text-[10px] font-bold uppercase tracking-brand transition-colors ${
              on ? "bg-gold-500/20 text-gold-400" : "border border-cream/10 text-cream/45 hover:border-gold-500/40 hover:text-gold-400"
            }`}
          >
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
