# Firebase setup (Google sign-in + data store)

Kubera uses **Firebase Auth** (Google + email/password) for sign-in and
**Firestore** for all data — orders, tables, inventory, loyalty, analytics. The
code reads your project from environment variables; you just create the project
and paste the config. ~10 minutes, one time.

> The app also runs **without** Firebase (the storefront renders in "no backend"
> mode). Firebase powers accounts, ordering, and the counter suite.

## ⚡ Fast path — the setup script

After creating the Firebase project (steps 1–2 below give you the config to
paste), run the guided setup. It fills `.env.local` with **your** details and
patches `firestore.rules` with your admin email automatically:

```bash
npm run setup          # interactive — paste your firebaseConfig, answer a few prompts
npm run check:setup    # verify nothing's missing before you deploy
```

Flags: `--quick` (essentials only) · `--defaults` (demo, no prompts) ·
`--dry-run` (preview, write nothing). The script generates a secure
`SHOPSENSE_INGEST_TOKEN`, backs up any existing `.env.local`, and (for multiple
admins) writes `email in [...]` into `isAdmin()`. Prefer the manual route? The
steps below still work by hand.

## 1. Create the project
1. Go to https://console.firebase.google.com → **Add project** → name it
   `kubera` (or anything). Analytics is optional.

## 2. Add a Web app + copy the config
1. In the project, click the **Web** icon (`</>`) → register an app.
2. Copy each `firebaseConfig` value into `.env.local` (and into your host's
   environment variables for production):
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`
3. Set `NEXT_PUBLIC_ADMIN_EMAILS` to your Google email (comma-separate for more).

> These `NEXT_PUBLIC_*` values are **public by design** — they ship in the
> client bundle. Security is enforced by Firestore rules + authorized domains,
> not by hiding them.

## 3. Enable sign-in methods
**Build → Authentication → Get started → Sign-in method:**
- **Google** → Enable → Save (used by /admin, /rewards, /login)
- **Email/Password** → Enable → Save (used by the register / sign-in / reset flow)

## 4. Authorise your domains
**Authentication → Settings → Authorized domains** → add `localhost` and each
domain you deploy to.

## 5. Create Firestore + publish rules
1. **Build → Firestore Database → Create database** → Production mode → pick a
   region close to your customers.
2. **Rules** tab → paste the contents of [`firestore.rules`](./firestore.rules),
   **replace every `you@example.com` with your admin email**, and **Publish**
   (or run `firebase deploy --only firestore:rules`).

## 6. Run
After setting the env vars: `npm run dev` (or deploy). Visit `/admin`, sign in
with Google, and your data flows in live.
