# Kubera → Android APK

Kubera ships as a downloadable Android `.apk` built with **Capacitor 8**. The APK
is a thin native WebView shell that loads your **deployed, running Kubera site**
(`KUBERA_APP_URL`). It runs the real Next.js server — all POST API routes
(`/api/contact`, `/api/waitlist`, `/api/loyalty/me`, `/api/shopsense/ingest`,
`/api/shopsense/analytics`), client Firebase, and runtime theming all work
unchanged. No app code is modified to produce the APK.

> **Requirement:** Kubera must be deployed to a reachable **HTTPS** origin first
> (Vercel free tier works). The app is **online-only** — a cold launch with no
> network shows a blank WebView. This is fine for a counter/till POS on shop
> Wi-Fi. True offline-first would be a separate Service-Worker project.

- **appId:** `com.oorulogix.kubera` (immutable once published — override with `KUBERA_APP_ID`)
- **appName:** `Kubera` (from `BRAND.name`; override with `KUBERA_APP_NAME`)
- **URL loaded:** `KUBERA_APP_URL` (defaults to `https://kubera.dev`)

---

## Step 0 — Deploy Kubera (one time, required)

Deploy to Vercel (Hobby/free tier). Set the `NEXT_PUBLIC_*`, `LOYVERSE_TOKEN`,
and `FIREBASE_*` env vars there, plus `NEXT_PUBLIC_SITE_URL` = your Vercel URL.
Note the resulting origin, e.g. `https://kubera-yourshop.vercel.app`. Add that
origin to Firebase **Authentication → Settings → Authorized domains** so sign-in
and the loyalty Identity-Toolkit calls work inside the WebView.

---

## Getting the APK without any local Android SDK (recommended)

The repo includes a GitHub Actions workflow (`.github/workflows/android.yml`)
that builds the `.apk` in the cloud.

1. In GitHub: **Settings → Secrets and variables → Actions → Variables → New
   repository variable** → name `KUBERA_APP_URL`, value = your deployed origin
   (e.g. `https://kubera-yourshop.vercel.app`).
2. **On every manual run (artifact):** Actions → **Build Android APK** →
   **Run workflow** (optionally type a one-off URL in the `app_url` box) →
   when it finishes, download **`kubera-debug-apk`** from the run's **Artifacts**
   section. (It downloads as a `.zip` wrapping `app-debug.apk` — unzip it.)
3. **On a version tag (Release — best for non-developers):**
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```
   The workflow builds and creates a **GitHub Release** with the raw
   `app-debug.apk` attached under
   `https://github.com/<owner>/kubera/releases`. Click the `.apk` to download.

---

## Building locally (only if you DO have the Android SDK + JDK 21)

Prerequisites: **Node 22+** (Capacitor 8's CLI requires it), **JDK 21**
(`JAVA_HOME` set), Android SDK with `platforms;android-36` +
`build-tools;36.0.0` + `platform-tools`, and `ANDROID_HOME` set. The Gradle
wrapper auto-downloads Gradle on first run.

```powershell
# One-time scaffold (only if android/ doesn't exist yet)
npm install
npm run cap:add        # = cap add android

# Point the shell at your running site, then sync + build
$env:KUBERA_APP_URL = "https://kubera-yourshop.vercel.app"
npm run cap:sync       # = cap sync android
npm run apk:debug      # = cd android && gradlew.bat assembleDebug
# APK -> android\app\build\outputs\apk\debug\app-debug.apk
```

LAN testing against `npm run dev` on your PC:

```powershell
$env:KUBERA_APP_URL = "http://192.168.1.50:3000"
$env:KUBERA_APP_CLEARTEXT = "true"   # required for plaintext http
npm run cap:sync
npm run apk:debug
```

The tablet must be on the **same Wi-Fi** as the dev PC for LAN mode.

---

## Installing on the tablet (Redmi Pad 2, model 2505DRP06I)

1. On the tablet: **Settings → About → tap Build number 7×** to unlock Developer
   options, then **Developer options → enable USB debugging**.
2. Connect the tablet via USB and authorize the prompt.
3. Install:
   ```powershell
   adb devices                                                  # confirm "device"
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```
   Or, with the repo scripts: `npm run apk:install`.
   (If you downloaded the APK from a Release, just point `adb install -r` at that
   file path. Non-developers can also copy the `.apk` to the tablet and tap it,
   after enabling "Install unknown apps" for the file manager.)

---

## Caveats

- **Online-only:** needs network to the host on launch (Capacitor `server.url`).
- **Debug signing:** the CI/`assembleDebug` APK is signed with Android's debug
  keystore — perfect for sideloading, **not** for the Play Store.
- **Play Store / production:** requires a **signed release** APK/AAB. Generate a
  keystore (`keytool -genkey -v -keystore release.keystore -alias kubera
  -keyalg RSA -keysize 2048 -validity 10000`), store it + passwords as repo
  secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`), add a `signingConfigs.release`
  block to `android/app/build.gradle`, and switch the build to `assembleRelease`.
- **No static export:** Kubera's POST route handlers read the incoming request,
  so `output: 'export'` is **not** an option — hence the remote-URL shell. Don't
  add `output: 'export'` to `next.config.mjs`.
- **appId is permanent:** changing `com.oorulogix.kubera` later makes Android
  treat it as a different app (separate install).
