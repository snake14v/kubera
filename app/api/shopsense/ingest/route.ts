import { NextResponse } from "next/server";

// Edge nodes (ESP32 SENSE/TRACK) POST footfall/occupancy/env events here.
// Auth: a shared bearer token (SHOPSENSE_INGEST_TOKEN) burned into the node firmware.
//
// SECURITY: firestore.rules denies direct client writes to `shopsense_events`
// (`allow create: if false`) so this token is the real gate. Persisting events
// therefore requires the Firebase Admin SDK (server credentials). Until that is
// configured, events are accepted + validated but not stored (nothing reads the
// collection yet — see the review roadmap). The endpoint fails CLOSED in
// production when the token is unset.
//
// Example body:
//   { "deviceId": "OL-SENSE-01", "type": "footfall", "value": 1, "zone": "entrance", "ts": 1718000000 }

type Event = {
  deviceId?: string;
  type?: string;
  value?: number;
  zone?: string;
  ts?: number;
  meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
    const expected = process.env.SHOPSENSE_INGEST_TOKEN;

    // Fail closed: in production an unset token would otherwise accept
    // unauthenticated posts. Only the dev environment may run open.
    if (!expected) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Ingest disabled: SHOPSENSE_INGEST_TOKEN is not set." },
          { status: 503 }
        );
      }
    } else {
      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (token !== expected) {
        return NextResponse.json({ error: "Unauthorized device." }, { status: 401 });
      }
    }

    const body = (await req.json()) as Event | Event[];
    const events = (Array.isArray(body) ? body : [body]).filter((e) => e && e.type);
    if (events.length === 0) {
      return NextResponse.json({ error: "No valid events." }, { status: 400 });
    }

    // NOTE: client-SDK writes to `shopsense_events` are denied by firestore.rules
    // by design. To persist, wire the Firebase Admin SDK here (see roadmap) and
    // write with admin credentials after this token check.
    return NextResponse.json({
      ok: true,
      accepted: events.length,
      stored: 0,
      note: "Token verified. Persistence requires the Firebase Admin SDK (not yet configured).",
    });
  } catch (err) {
    console.error("[shopsense/ingest] error", err);
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
