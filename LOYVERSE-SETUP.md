# Loyverse rewards setup

The `/rewards` page is a **customer loyalty portal** wired to your Loyverse POS.
Customers sign in with Google → the site finds (or creates) their Loyverse customer
by email → shows their **points balance, tier, and a member QR**. Points are earned
**in-shop on Loyverse**; the site reads and displays them.

> Stack note: this matches the **Oorulogix stack** (Firebase auth + a serverless API +
> Tailwind/Framer), so the same pattern drops into your other Oorulogix sites.

## How it fits together
```
Customer → Google login (Firebase) → /api/loyalty/me
         → verifies the Firebase token (no service account; uses your Web API key)
         → Loyverse API: find/create customer by email → returns points + QR
At the bar → cashier scans the member QR (customer_code) → Loyverse adds points
```

## 1. Firebase
Google sign-in must be on (see [FIREBASE-SETUP.md](./FIREBASE-SETUP.md)). The rewards
portal reuses the exact same Google auth as `/admin`.

## 2. Loyverse access token
1. In Loyverse: **Settings → Access tokens → + Add** (or the Loyverse API page).
2. Copy the token into `LOYVERSE_TOKEN`:
   - locally in `.env.local`
   - in **Vercel → orbean-coffee → Settings → Environment Variables** (server-side, *not* `NEXT_PUBLIC`)
3. Redeploy. `/rewards` now shows real balances.

## Behaviour
- **Token not set** → `/rewards` still works: customers sign in and see "membership saved,
  points start at opening." (Graceful — nothing breaks pre-launch.)
- **Token set** → on first sign-in the customer is created in Loyverse with a stable
  `customer_code` (`ORB……`); the QR encodes that code for the POS to scan.

## Tiers (cosmetic — edit in `lib/loyalty.ts`)
`Bean` (0–149 pts) → `Brew` (150–499) → `Gold` (500+). Adjust thresholds to match the
points rate you configure in Loyverse's loyalty settings.

## Notes
- Member identity = **email** (Google). Make sure the Loyverse loyalty program is enabled
  and customers are matched by email at the till.
- The QR is generated server-side and is just the `customer_code`; you can also type the
  `ORB……` code into Loyverse's customer search manually.
