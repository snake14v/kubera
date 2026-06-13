# Kubera — handoff notes (read me first)

**Kubera** is an open-source point-of-sale + storefront platform (AGPL-3.0),
**open-sourced by Oorulogix**. **ShopSense** is the commercial hardware line
(the monetisation arm). It was forked from a café build and fully de-branded
into a generic, config-driven product.

## State right now ✅
- De-branded: zero café/personal identity left (scanned). Branding is config-
  driven via [`lib/brand.ts`](lib/brand.ts) + `NEXT_PUBLIC_*` env. Swap the name
  in one place.
- Firebase reads from **env** (`lib/firebaseConfig.ts`); runs in "no backend"
  mode if unset, so `npm run build` works on a fresh clone (verified, 34/34).
- OSS scaffolding in place: `LICENSE` (AGPL-3.0), `README.md`, `CONTRIBUTING.md`,
  `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.env.local.example`, `FIREBASE-SETUP.md`.
- Fresh git history (1 commit on `main`). **Not yet pushed to GitHub.**
- No secrets/keystores/APKs in the repo (excluded at clone time + `.gitignore`).

## The vision for the next session 🎯
1. **One self-demonstrating website** — the marketing site *is* the live product.
   Visitors try every feature on the very site that advertises it (dogfooding).
   One deploy = demo + landing + advertisement.
2. **GitHub** as the hub, with **APK + iOS** download links paired next to the
   live demo.
3. **Neo-cyber KUBERA wordmark** styling (use the existing `rgb-cyber` /
   `rgb-text` classes in `app/globals.css`).

## Designed but NOT yet built (tasks were queued)
- **In-app Help/wiki** — `lib/help.ts` registry + a `HelpButton (?)` on every
  feature + a `/help` wiki page. ("explain everything / how-to buttons")
- **One-time Setup wizard** (`/setup`) — guided business config saved to a
  Firestore `settings/site` doc via a `useSiteConfig` hook, plus a copy-paste
  env block + Firebase connection check. ("set up once, then just use it")
- **Demo seed data** so the live demo is populated out of the box.

## Push to GitHub when ready
```bash
cd C:\Users\VAISHAK\Kubera
gh repo create kubera --public --source=. --remote=origin --push
#   (or under the org:)  gh repo create oorulogix/kubera --public --source=. --push
```
Then set the real repo/site URLs via env (`NEXT_PUBLIC_REPO_URL`,
`NEXT_PUBLIC_PROJECT_URL`) or in `lib/brand.ts`.

## Run it
```bash
npm install          # deps already present from the fork
cp .env.local.example .env.local   # optional; blank = demo/no-backend
npm run dev          # http://localhost:3000
```

## Before going public, remember
- In `firestore.rules`, replace every `you@example.com` with your admin Google
  account, and set the same in `NEXT_PUBLIC_ADMIN_EMAILS`.
- Server secrets (`RESEND_API_KEY`, `LOYVERSE_TOKEN`, `SHOPSENSE_INGEST_TOKEN`)
  are server-only — never `NEXT_PUBLIC_*`.
