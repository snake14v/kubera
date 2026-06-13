import Link from "next/link";
import { BRAND } from "@/lib/brand";
import {
  ADDRESS_LINE1,
  ADDRESS_LINE2,
  PHONE_PRIMARY,
  EMAIL,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  waLink,
} from "@/lib/contact";

const explore = [
  ["Menu", "/menu"],
  ["Rewards", "/rewards"],
  ["About", "/about"],
  ["Franchise", "/franchise"],
  ["Careers", "/careers"],
  ["Contact", "/contact"],
];

export default function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-forest-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-3">
        {/* Brand */}
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-cream">
            {BRAND.business.name}
          </p>
          <p className="mt-3 max-w-xs font-body text-sm text-cream/55">
            {BRAND.business.tagline} {ADDRESS_LINE1}, {ADDRESS_LINE2}.
            {BRAND.business.opening ? ` ${BRAND.business.opening}.` : ""}
          </p>
        </div>

        {/* Explore */}
        <div>
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">
            Explore
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 font-body text-sm text-cream/70">
            {explore.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-gold-400">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Connect */}
        <div>
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">
            Connect
          </p>
          <ul className="mt-4 space-y-2 font-body text-sm text-cream/70">
            {INSTAGRAM_HANDLE && (
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold-400">
                  Instagram @{INSTAGRAM_HANDLE}
                </a>
              </li>
            )}
            <li>
              <a href={waLink(`Hi ${BRAND.business.name}, I'd like to know more —`)} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold-400">
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-gold-400">
                {EMAIL}
              </a>
            </li>
            {PHONE_PRIMARY && (
              <li>
                <a href={`tel:${PHONE_PRIMARY.replace(/\s/g, "")}`} className="transition-colors hover:text-gold-400">
                  {PHONE_PRIMARY}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-6 sm:flex-row sm:px-8">
          <p className="font-body text-xs text-cream/40">
            © {new Date().getFullYear()} {BRAND.business.name}
          </p>
          <p className="font-body text-xs text-cream/40">
            Powered by{" "}
            <a
              href={BRAND.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gold-400 transition-opacity hover:opacity-80"
            >
              {BRAND.name}
            </a>{" "}
            · open-sourced by{" "}
            <a
              href={BRAND.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rgb-text font-bold transition-opacity hover:opacity-80"
            >
              {BRAND.author}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
