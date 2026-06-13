# Contributing to Kubera

Thanks for helping build an open POS for shopkeepers everywhere. 🙌

## Ground rules

- Be respectful — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- By contributing you agree your work is licensed under the project's
  [AGPL-3.0](LICENSE).
- **Never commit secrets.** No API keys, tokens, keystores, `.env*` files, or
  real customer data. The repo ships only `.env.local.example`.

## Dev setup

```bash
npm install
cp .env.local.example .env.local   # optional — app runs without a backend
npm run dev
npm run build                      # must pass before you open a PR
```

## Workflow

1. Fork & branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Keep changes focused. Match the surrounding code style (TypeScript, no new
   lint errors, Tailwind utility classes, existing naming).
3. `npm run build` and `npm run lint` must be clean.
4. Open a PR describing **what** and **why**. Screenshots for UI changes.

## Good first issues

- Translations / i18n of the storefront and counter UI.
- Backend adapters (the data layer is Firestore today — a Postgres/Supabase
  adapter is a high-value contribution).
- Printer driver coverage (more ESC/POS models).
- Accessibility passes on the counter surfaces.

## Project shape

- `app/` — routes (storefront, `/cashier` `/cds` `/kds` `/staff` `/admin`, API).
- `components/` — UI; `components/order/` is the ordering flow.
- `lib/` — domain logic, Firebase, branding (`lib/brand.ts`), printing, tiers.
- `firestore.rules` — the security model. Update it alongside data changes.

Questions? Open a discussion or issue. Happy hacking.
