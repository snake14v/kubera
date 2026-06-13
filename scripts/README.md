# Kubera scripts

Zero-dependency Node setup helpers (run from the repo root).

## `npm run setup`
Interactive configurator. Fills `.env.local` from `.env.local.example` with your
business, currency/locale, geo, admin, Firebase, and optional-service values, and
patches `firestore.rules` so `isAdmin()` uses your admin email instead of the
`you@example.com` placeholder.

- Paste your whole `firebaseConfig = { … }` block — it's parsed into the six
  `NEXT_PUBLIC_FIREBASE_*` vars.
- Generates a secure `SHOPSENSE_INGEST_TOKEN`.
- Multiple admins → `request.auth.token.email in ['a@x.com','b@x.com']`.
- Backs up any existing `.env.local` to `.env.local.bak`.

Flags:

| Flag | Effect |
|---|---|
| `--quick` | Ask only the essentials (name, admin, Firebase). |
| `--defaults` | Accept all demo defaults, no prompts (CI/demo). |
| `--dry-run` | Show what would change; write nothing. |

```bash
npm run setup
npm run setup -- --quick
npm run setup -- --defaults --dry-run
```

## `npm run check:setup`
Pre-deploy verifier. Confirms `.env.local` exists, Firebase config is complete (or
cleanly absent for demo mode), the admin allow-list is set (not the placeholder),
`firestore.rules` no longer contains `you@example.com` and matches your admin
email(s), and warns if `SHOPSENSE_INGEST_TOKEN` is blank. Exits non-zero on hard
failures, so it can gate CI or a pre-deploy step.

`--require` makes a missing/placeholder config a hard failure (used by the deploy
gate). Without it, a missing `.env.local` is treated as demo/CI mode and passes —
so this is safe to run in CI without secrets.

## `npm run firebase:deploy`
Safe wrapper around `firebase deploy`. Runs `check:setup --require` first (won't
deploy a placeholder admin email), ensures `firebase.json` references
`firestore.rules` + `firestore.indexes.json`, verifies the Firebase CLI is
installed, then deploys **rules + indexes** — passing your `--project` from
`.env.local` when present.

```bash
npm run firebase:deploy              # verify + deploy
npm run firebase:deploy -- --dry-run # show the plan, run nothing
```

Requires `npm install -g firebase-tools` and `firebase login`. Composite indexes
go in `firestore.indexes.json` (empty today — add them as bounded queries land).

## After setup
```bash
npm run firebase:deploy   # verify + publish rules & indexes
npm run dev               # or deploy the app
```
Then enable Google + Email/Password sign-in and add your domain to Authorized
domains — see [../FIREBASE-SETUP.md](../FIREBASE-SETUP.md).
