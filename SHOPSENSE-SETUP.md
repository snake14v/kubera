# ShopSense — Orbéan pilot zero

Orbéan is the **first ShopSense deployment**. The software layer ships with this site;
the edge hardware (ESP32 SENSE/TRACK nodes) POSTs into it.

```
ESP32 SENSE/TRACK ──POST /api/shopsense/ingest──► Firestore (shopsense_events)
Loyverse POS ──────GET receipts (server)─────────► /api/shopsense/analytics
                                                         │
                              Google-login admin ► /admin/shopsense (console)
```

## Console
- **URL:** `/admin/shopsense` (same Google sign-in + admin allow-list as `/admin`; reachable from the Admin → ShopSense tab).
- Shows footfall, live occupancy, capture rate, dwell, peak hours, 7-day trend,
  **burn-vs-revenue** efficiency, inventory burn-rate, alerts and device status.
- Runs on **demo data** until sensors + Loyverse are connected, then flips to **live**.

## 1. Ingestion (the edge nodes)
Each node POSTs events with the shared bearer token `SHOPSENSE_INGEST_TOKEN`:

```http
POST /api/shopsense/ingest
Authorization: Bearer <SHOPSENSE_INGEST_TOKEN>
Content-Type: application/json

{ "deviceId": "OL-SENSE-01", "type": "footfall", "value": 1, "zone": "entrance", "ts": 1718000000 }
```
- Batch: send an array of events too.
- `type` examples: `footfall`, `occupancy`, `queue`, `temp`, `humidity`.
- Stored in Firestore `shopsense_events` (rules allow create; admin-only read).
- Set `SHOPSENSE_INGEST_TOKEN` in `.env.local` and Vercel, and burn the same value into firmware.

## 2. Revenue feed (burn-vs-revenue)
Set `LOYVERSE_TOKEN` (see [LOYVERSE-SETUP.md](./LOYVERSE-SETUP.md)). The analytics route
pulls **today's receipts** (IST) and feeds real sales into the console — the "Demo data"
badge becomes "● Live".

## 3. Firestore rules
Already in [`firestore.rules`](./firestore.rules) — publish them and set your admin email.

## What's software vs hardware
- **Built here (software):** console, ingestion API, Loyverse analytics, alerts model, data model.
- **Yours (hardware):** the SENSE (ESP32-C3 + PIR + BME280) and TRACK (ESP32-S3 + IR beams + reed)
  nodes that POST footfall/occupancy. Until they're online, the console shows modelled data.

## Next (roadmap)
- Vision Edge: 30s frame sampling → occupancy/queue → Model Mesh metadata reasoning.
- WhatsApp daily brief (restock + peak alerts).
- Per-SKU burn-rate straight from Loyverse inventory levels.
