// Centralised number / money / date formatting — locale & currency driven by
// BRAND.business (NEXT_PUBLIC_CURRENCY / _CURRENCY_CODE / _LOCALE / _TIMEZONE).
// Replaces the ~11 copies of `const inr = …` that were scattered across the UI.

import { BRAND } from "./brand";

const LOCALE = BRAND.business.locale;
const SYMBOL = BRAND.business.currency;
const TZ = BRAND.business.timezone;

/** Format a money amount with the deployer's currency symbol + locale grouping.
 *  e.g. money(1299) → "₹1,299". Rounds to whole units by default. */
export function money(n: number | null | undefined, opts?: { decimals?: number }): string {
  const value = typeof n === "number" && Number.isFinite(n) ? n : 0;
  const decimals = opts?.decimals ?? 0;
  return (
    SYMBOL +
    value.toLocaleString(LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/** Back-compat alias for the old `inr` helper — same behaviour, now config-driven. */
export const inr = (n: number | null | undefined): string => money(n);

/** Plain "Rs."-style ASCII money for thermal receipts (no unicode symbol). */
export function moneyAscii(n: number | null | undefined, prefix = "Rs."): string {
  const value = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return prefix + value.toLocaleString(LOCALE);
}

/** Locale + timezone aware date/time. */
export function fmtDateTime(
  d: Date | null | undefined,
  style: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string {
  if (!d) return "—";
  return d.toLocaleString(LOCALE, { timeZone: TZ, ...style });
}
