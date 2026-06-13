"use client";

// App-style bottom navigation for the customer app (and mobile web).
// Hidden on desktop (the top Nav covers it) and on all staff/ops routes.
// Sits above the order page's sticky bars (which lift to bottom-14).

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/order", label: "Order", icon: "☕" },
  { href: "/rewards", label: "Rewards", icon: "★" },
  { href: "/account", label: "Account", icon: "👤" },
];

// surfaces that are full-screen tools, not customer journeys
const OPS = ["/staff", "/admin", "/kds", "/cds", "/cashier", "/waiter", "/tabs", "/login"];

export default function BottomNav() {
  const path = usePathname() || "/";
  if (OPS.some((p) => path === p || path.startsWith(p + "/"))) return null;

  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <>
      {/* spacer keeps page content clear of the fixed bar (mobile only) */}
      <div className="h-[56px] lg:hidden" aria-hidden />
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-[60] border-t border-cream/10 bg-forest-950/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => {
            const on = active(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 font-body text-[10px] font-bold uppercase tracking-brand transition-colors ${
                  on ? "text-gold-400" : "text-cream/45"
                }`}
              >
                <span className={`text-lg leading-none ${on ? "scale-110" : ""} transition-transform`}>{t.icon}</span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
