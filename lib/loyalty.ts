// Loyverse API client (server-only — uses the secret LOYVERSE_TOKEN).
// Docs: https://developer.loyverse.com/docs/  ·  base https://api.loyverse.com/v1.0

const BASE = "https://api.loyverse.com/v1.0";

export type LoyverseCustomer = {
  id: string;
  name?: string;
  email?: string;
  phone_number?: string;
  customer_code?: string;
  total_points?: number;
  total_spent?: number;
  total_visits?: number;
  first_visit?: string;
  created_at?: string;
};

export type Tier = { name: string; next?: string; toNext?: number };

export function tierFor(points: number): Tier {
  if (points >= 500) return { name: "Gold" };
  if (points >= 150) return { name: "Brew", next: "Gold", toNext: 500 - points };
  return { name: "Bean", next: "Brew", toNext: 150 - points };
}

/** Stable member code from an email — same user always maps to the same code. */
export function memberCodeFor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) | 0;
  return "ORB" + Math.abs(h).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

async function lv(path: string, token: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

export async function findCustomerByEmail(
  email: string,
  token: string
): Promise<LoyverseCustomer | null> {
  const res = await lv(`/customers?email=${encodeURIComponent(email)}&limit=10`, token);
  if (!res.ok) return null;
  const data = await res.json();
  const list: LoyverseCustomer[] = data.customers || [];
  return (
    list.find((c) => (c.email || "").toLowerCase() === email.toLowerCase()) ||
    list[0] ||
    null
  );
}

export async function createCustomer(
  email: string,
  name: string,
  code: string,
  token: string
): Promise<LoyverseCustomer | null> {
  const res = await lv(`/customers`, token, {
    method: "POST",
    body: JSON.stringify({ name: name || email, email, customer_code: code }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Privacy-preserving phone key for PUBLIC collections (collectibles are
 *  world-readable): SHA-256 of the last 10 digits. The owner can recompute
 *  it to match their cards; a scraper can't harvest numbers from it. */
export async function phoneKey(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("orb:" + digits));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
