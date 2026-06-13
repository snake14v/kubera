// Staff portal domain — PIN check-in, attendance, digital shift forms.

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  pinHash: string;
  active: boolean;
};

export type AttendanceRec = {
  id: string;
  staffId: string;
  name: string;
  role: string;
  date: string; // YYYY-MM-DD (IST)
  inAt?: { toMillis(): number } | null;
  outAt?: { toMillis(): number } | null;
};

export const STAFF_ROLES = [
  "Manager",
  "Sr. Barista",
  "Jr. Barista",
  "Kitchen & Juice",
  "Steward",
  "Part-time",
] as const;

/** SHA-256(pin + ':' + staffId) — keeps raw PINs out of Firestore. (4-digit
 *  PINs are attendance-grade security, not vault-grade — by design.) */
export async function pinHash(pin: string, staffId: string): Promise<string> {
  const data = new TextEncoder().encode(`${pin}:${staffId}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Today's date key in IST. */
export function istDateKey(d = new Date()): string {
  const ist = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
  return ist.toISOString().slice(0, 10);
}

export function istClock(d = new Date()): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export const OPENING_ITEMS = [
  "Espresso machine on & up to temp — dial-in shot logged",
  "Grinder hopper fresh; last night's backflush confirmed",
  "Matcha station: tin weighed, whisk/bowl clean, 70°C water",
  "Milk fridge temp logged; dairy delivery checked vs invoice",
  "Juice batch #1 pressed & tagged; display fridge FIFO",
  "Bakery delivery checked ≤07:00; croissants & cheesecake set",
  "Floor swept, tables set, washroom checked, charging points OK",
  "POS on; float counted; table QRs on every table",
  "Online ordering ON (07:30); order board open + sound on",
  "Music on; signage lights; menu boards match (no ghost 86s)",
  "Staff on floor per rota; aprons on; phones in lockers",
  "Yesterday's close form filed; today's clipboard ready",
] as const;
