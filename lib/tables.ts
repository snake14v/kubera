// Table floor-view domain — sittings from seat to leave, per-table log.
// A "sitting" (table_sessions doc) opens when guests are seated (or when a
// QR order lands on a free table and staff confirm), collects PIN-signed
// log events, and closes when the guests leave — duration + spend stamped.

export const TABLE_COUNT = 10;

export type TableLogEntry = { text: string; by: string; atMs: number };

export type TableSession = {
  id: string;
  table: string; // "1".."10"
  date: string; // YYYY-MM-DD (IST) — sittings are day-scoped like the FRMs
  openedAtMs: number;
  openedBy: string;
  guests: number | null;
  closedAtMs: number | null;
  closedBy: string | null;
  tablePin?: string; // per-sitting PIN the waiter gives the guest to order
  log: TableLogEntry[];
};

/** 4-digit table PIN — issued per sitting, rotates each time. */
export function newTablePin(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(1000 + (a[0] % 9000));
}

/** Unguessable value to park in table_codes when a table is freed, so no
 *  PIN validates against a closed table. */
export function deadCode(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return "x" + Array.from(a, (b) => b.toString(16)).join("");
}

export function fmtDur(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function fmtClock(atMs: number): string {
  return new Date(atMs).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
