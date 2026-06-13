"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// label, href, accent colour (hover/active)
const links: [string, string, string][] = [
  ["Order", "/order", "#E0A23C"],
  ["Menu", "/menu", "#8FB573"],
  ["Rewards", "/rewards", "#D6B693"],
  ["About", "/about", "#E58CA0"],
  ["Franchise", "/franchise", "#8B9DE0"],
  ["Careers", "/careers", "#7FC8A9"],
  ["Contact", "/contact", "#EFD35C"],
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    // lazy so firebase stays out of the shared bundle
    import("@/lib/firebase").then(({ auth }) => {
      if (!auth) return;
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        unsub = onAuthStateChanged(auth, (u) => setSignedIn(!!u));
      });
    });
    return () => unsub?.();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-cream/10 bg-forest-950/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-cream">
          ORB<span className="rgb-text">É</span>AN
          <span className="ml-2 align-middle font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">
            Coffee
          </span>
        </Link>

        <ul className="hidden items-center gap-8 font-body text-[11px] font-bold uppercase tracking-brand lg:flex">
          {links.map(([label, href, accent]) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="group relative inline-block pb-1 transition-colors duration-300"
                  style={{ color: active ? accent : "rgba(232,223,201,0.7)" }}
                >
                  <span className="transition-colors duration-300 group-hover:text-[var(--lk)]" style={{ ["--lk" as string]: accent }}>
                    {label}
                  </span>
                  {/* animated accent underline */}
                  <span
                    className={`absolute inset-x-0 bottom-0 h-px origin-left transition-transform duration-300 ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                    style={{ backgroundColor: accent }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href={signedIn ? "/account" : "/login"}
            className="hidden rounded-full border border-cream/20 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-cream/80 transition-colors hover:border-gold-500 hover:text-gold-400 sm:inline-block"
          >
            {signedIn ? "Account" : "Sign in"}
          </Link>
          <Link
            href="/#waitlist"
            className="btn-sheen hidden rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 transition-colors hover:bg-gold-700 sm:inline-block"
          >
            Join
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="text-cream lg:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-cream/10 bg-forest-950 lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 font-body text-sm font-bold uppercase tracking-brand text-cream/80 sm:px-8">
            {links.map(([label, href, accent]) => (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 py-2.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={signedIn ? "/account" : "/login"} onClick={() => setOpen(false)} className="mt-2 block rounded-full border border-cream/20 px-5 py-2.5 text-center text-cream/80">
                {signedIn ? "My account" : "Sign in"}
              </Link>
            </li>
            <li>
              <Link href="/#waitlist" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-gold-500 px-5 py-2.5 text-center text-forest-950">
                Join the waitlist
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
