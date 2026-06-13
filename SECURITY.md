# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Email
`security@example.com` (replace with the maintainer address for your fork) with:

- a description and impact,
- steps to reproduce,
- affected version / commit.

We aim to acknowledge within 72 hours and to coordinate a fix and disclosure
timeline with you. Thank you for reporting responsibly.

## Security model (what to know before deploying)

- **Firebase web config is public by design** — it ships in the client bundle.
  Security is enforced by [`firestore.rules`](firestore.rules) and the Auth
  authorized-domains list, **not** by hiding the config.
- **Set your admin email in two places**: `NEXT_PUBLIC_ADMIN_EMAILS` (env) and
  every `you@example.com` in `firestore.rules`. They must match, and the rules
  are the real boundary.
- **Staff PINs are attendance-grade, not vault-grade** — they identify who did
  an action for the audit trail; they are not a cryptographic auth boundary.
- **Server secrets** (`RESEND_API_KEY`, `LOYVERSE_TOKEN`, `SHOPSENSE_INGEST_TOKEN`)
  must only ever be set as server-side env vars — never `NEXT_PUBLIC_*`.
- Restrict your Firebase API key (HTTP referrers) and lock Authorized Domains to
  your real hosts before going live.
