import { NextResponse } from "next/server";

// Edge nodes (ESP32 SENSE/TRACK) POST footfall/occupancy/env events here.
// Auth: a shared bearer token (SHOPSENSE_INGEST_TOKEN) burned into the node firmware.
// Events are written to Firestore `shopsense_events` via the client SDK (rules allow create).
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
    if (expected) {
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

    // Persist to Firestore if configured (best-effort, graceful otherwise).
    let stored = 0;
    try {
      const { db } = await import("@/lib/firebase");
      if (db) {
        const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
        for (const e of events) {
          await addDoc(collection(db, "shopsense_events"), {
            deviceId: e.deviceId ?? "unknown",
            type: e.type,
            value: typeof e.value === "number" ? e.value : 1,
            zone: e.zone ?? null,
            clientTs: e.ts ?? null,
            meta: e.meta ?? null,
            receivedAt: serverTimestamp(),
          });
          stored++;
        }
      }
    } catch (err) {
      console.warn("[shopsense] firestore write skipped:", err);
    }

    return NextResponse.json({ ok: true, accepted: events.length, stored });
  } catch (err) {
    console.error("[shopsense/ingest] error", err);
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
