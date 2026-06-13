import { NextResponse } from "next/server";
import { cleanEnv } from "@/lib/cleanEnv";
import { FIREBASE_API_KEY } from "@/lib/firebaseConfig";

const ADMINS = (cleanEnv(process.env.NEXT_PUBLIC_ADMIN_EMAILS) || "you@example.com")
  .split(",")
  .map((e) => cleanEnv(e).toLowerCase())
  .filter(Boolean);

async function verifyAdmin(idToken: string): Promise<boolean> {
  const key = FIREBASE_API_KEY;
  if (!key) return false;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  const email = String(data.users?.[0]?.email || "").toLowerCase();
  return Boolean(email) && (ADMINS.length === 0 || ADMINS.includes(email));
}

/** Start of today in IST, as a UTC ISO string. */
function istMidnightISO(now: number): string {
  const IST = 5.5 * 3600 * 1000;
  const ist = new Date(now + IST);
  const midnightUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST;
  return new Date(midnightUtc).toISOString();
}

export async function POST(req: Request) {
  try {
    const idToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!idToken || !(await verifyAdmin(idToken))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const token = process.env.LOYVERSE_TOKEN;
    if (!token) {
      return NextResponse.json({ mode: "demo" });
    }

    const since = istMidnightISO(Date.now());
    const res = await fetch(
      `https://api.loyverse.com/v1.0/receipts?created_at_min=${encodeURIComponent(since)}&limit=250`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ mode: "demo", note: "loyverse fetch failed" });
    }
    const data = await res.json();
    const receipts: Array<{ total_money?: number; receipt_type?: string }> = data.receipts || [];
    const sales = receipts.filter((r) => r.receipt_type !== "REFUND");
    const salesToday = Math.round(sales.reduce((s, r) => s + (Number(r.total_money) || 0), 0));

    return NextResponse.json({
      mode: "live",
      salesToday,
      receiptCount: sales.length,
      since,
    });
  } catch (err) {
    console.error("[shopsense/analytics] error", err);
    return NextResponse.json({ mode: "demo", note: "error" });
  }
}
