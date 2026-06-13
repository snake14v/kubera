import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  findCustomerByEmail,
  createCustomer,
  memberCodeFor,
  tierFor,
} from "@/lib/loyalty";
import { FIREBASE_API_KEY } from "@/lib/firebaseConfig";

// Verify a Firebase ID token using the public Web API key (no Admin SDK needed):
// a valid token returns the user record from Identity Toolkit.
async function verifyUser(idToken: string): Promise<{ email: string; name?: string } | null> {
  const key = FIREBASE_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const u = data.users?.[0];
  if (!u?.email) return null;
  return { email: String(u.email).toLowerCase(), name: u.displayName };
}

export async function POST(req: Request) {
  try {
    const idToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!idToken) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const user = await verifyUser(idToken);
    if (!user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const token = process.env.LOYVERSE_TOKEN;
    // Loyverse not wired yet — still confirm the login worked (graceful).
    if (!token) {
      return NextResponse.json({ configured: false, email: user.email, name: user.name });
    }

    let cust = await findCustomerByEmail(user.email, token);
    if (!cust) {
      cust = await createCustomer(
        user.email,
        user.name || user.email,
        memberCodeFor(user.email),
        token
      );
    }

    const points = Number(cust?.total_points ?? 0);
    const memberCode = cust?.customer_code || memberCodeFor(user.email);
    const qr = await QRCode.toDataURL(memberCode, {
      margin: 1,
      width: 260,
      color: { dark: "#0D0E08", light: "#E8DFC9" },
    });

    return NextResponse.json({
      configured: true,
      isMember: Boolean(cust),
      email: user.email,
      name: cust?.name || user.name || user.email,
      points,
      totalSpent: Number(cust?.total_spent ?? 0),
      totalVisits: Number(cust?.total_visits ?? 0),
      memberCode,
      memberSince: cust?.first_visit || cust?.created_at || null,
      tier: tierFor(points),
      qr,
    });
  } catch (err) {
    console.error("[loyalty] error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
