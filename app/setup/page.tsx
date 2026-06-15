"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider, firebaseEnabled, isAdmin, ADMIN_EMAILS } from "@/lib/firebase";
import { BRAND } from "@/lib/brand";
import { useMounted } from "@/lib/useMounted";
import {
  writeStoredFirebase,
  writeStoredAdmins,
  clearStoredConfig,
  parseFirebaseConfigBlock,
  isCompleteFirebase,
  type FirebaseWebConfig,
} from "@/lib/runtimeConfig";
import {
  CONFIG_FIELDS,
  buildEnvBlock,
  adminRulesSnippet,
  buildChecklist,
  MANUAL_REMINDERS,
  SURFACES,
  DOCS,
  TROUBLESHOOTING,
  SETUP_STEPS,
  type ConfigGroup,
  type CheckState,
} from "@/lib/setup";

const field =
  "w-full rounded-xl border border-cream/15 bg-forest-850/80 px-4 py-2.5 font-body text-sm text-cream outline-none transition-colors placeholder:text-cream/35 focus:border-gold-500";
const btnGold =
  "rounded-full bg-gold-500 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-40 disabled:cursor-not-allowed";
const btnGhost =
  "rounded-full border border-cream/20 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-cream/65 hover:border-gold-500 hover:text-gold-400";
const cardCls = "rounded-2xl border border-cream/10 bg-forest-900/60 p-5 sm:p-6";

const seed = (): Record<string, string> =>
  Object.fromEntries(CONFIG_FIELDS.map((f) => [f.key, f.def ?? ""]));

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState<Record<string, string>>(seed);
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState("");
  const mounted = useMounted();

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  const set = (k: string, v: string) => setCfg((c) => ({ ...c, [k]: v }));
  const envBlock = useMemo(() => buildEnvBlock(cfg), [cfg]);
  const adminRaw = cfg.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const rulesSnippet = useMemo(() => adminRulesSnippet(adminRaw), [adminRaw]);

  const checkState: CheckState = {
    firebaseEnabled,
    adminConfigured: ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes("you@example.com"),
    signedIn: !!user,
    isCurrentAdmin: isAdmin(user?.email),
    brandCustomized: BRAND.business.name !== "Demo Café",
  };

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  function genToken() {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    set("SHOPSENSE_INGEST_TOKEN", Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join(""));
  }

  // Fill the 6 Firebase fields from a pasted `firebaseConfig = { … }` block.
  function pasteFill(text: string) {
    const fb = parseFirebaseConfigBlock(text);
    if (fb.apiKey) set("NEXT_PUBLIC_FIREBASE_API_KEY", fb.apiKey);
    if (fb.authDomain) set("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", fb.authDomain);
    if (fb.projectId) set("NEXT_PUBLIC_FIREBASE_PROJECT_ID", fb.projectId);
    if (fb.storageBucket) set("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", fb.storageBucket);
    if (fb.messagingSenderId) set("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", fb.messagingSenderId);
    if (fb.appId) set("NEXT_PUBLIC_FIREBASE_APP_ID", fb.appId);
  }

  // Save the entered config on THIS device (runtime, no rebuild) and reload so
  // the whole app re-initialises Firebase from it. Returns an error message or "".
  function connectThisDevice(): string {
    const fb: FirebaseWebConfig = {
      apiKey: (cfg.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
      authDomain: (cfg.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim(),
      projectId: (cfg.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim(),
      storageBucket: (cfg.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim(),
      messagingSenderId: (cfg.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
      appId: (cfg.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim(),
    };
    if (!isCompleteFirebase(fb)) return "Enter at least the apiKey and projectId.";
    const admins = adminRaw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!admins.length) return "Set your admin email in the Admin step first.";
    writeStoredFirebase(fb);
    writeStoredAdmins(admins);
    window.location.reload();
    return "";
  }

  function disconnect() {
    clearStoredConfig();
    window.location.reload();
  }

  const id = SETUP_STEPS[step].id;
  const last = SETUP_STEPS.length - 1;

  if (!mounted) return <main className="min-h-screen bg-forest-950" />;

  return (
    <main className="min-h-screen bg-forest-950 pb-24">
      <header className="border-b border-cream/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="font-display text-lg font-bold tracking-tight text-cream">
            {BRAND.business.name}
            <span className="ml-2 align-middle font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">Setup</span>
          </a>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 font-body text-[10px] font-bold uppercase tracking-brand ${firebaseEnabled ? "bg-emerald-500/15 text-emerald-500" : "bg-gold-500/15 text-gold-400"}`}>
              {firebaseEnabled ? "Backend connected" : "Demo mode"}
            </span>
            {firebaseEnabled && auth && (
              user ? (
                <button onClick={() => signOut(auth!)} className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 hover:text-gold-400">Sign out</button>
              ) : (
                <button onClick={() => signInWithPopup(auth!, googleProvider).catch(() => {})} className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 hover:text-gold-400">Sign in</button>
              )
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[260px_1fr]">
        {/* Step rail */}
        <nav aria-label="Setup steps" className="lg:sticky lg:top-8 lg:self-start">
          <ol className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:gap-1">
            {SETUP_STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "now" : "next";
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    onClick={() => setStep(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === step ? "bg-forest-850" : "hover:bg-forest-900"}`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-body text-[11px] font-bold ${state === "done" ? "bg-gold-500 text-forest-950" : state === "now" ? "border border-gold-500 text-gold-400" : "border border-cream/20 text-cream/40"}`}>
                      {state === "done" ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-body text-sm font-bold ${i === step ? "text-cream" : "text-cream/70"}`}>{s.title}</span>
                      <span className="hidden truncate font-body text-[11px] text-cream/45 lg:block">{s.blurb}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Panel */}
        <section className="min-w-0">
          {id === "welcome" && <Welcome />}
          {id === "brand" && <FormGroups groups={["Business", "Money & locale", "Storefront", "Admin"]} cfg={cfg} set={set} envBlock={envBlock} copy={copy} copied={copied} />}
          {id === "firebase" && <Firebase cfg={cfg} set={set} envBlock={envBlock} copy={copy} copied={copied} firebaseEnabled={firebaseEnabled} pasteFill={pasteFill} connectThisDevice={connectThisDevice} disconnect={disconnect} />}
          {id === "admin" && <Admin adminRaw={adminRaw} set={set} rulesSnippet={rulesSnippet} copy={copy} copied={copied} check={checkState} />}
          {id === "services" && <Services cfg={cfg} set={set} genToken={genToken} envBlock={envBlock} copy={copy} copied={copied} />}
          {id === "golive" && <GoLive check={checkState} copy={copy} copied={copied} />}

          <div className="mt-8 flex items-center justify-between border-t border-cream/10 pt-6">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={btnGhost}>← Back</button>
            <span className="font-body text-[11px] uppercase tracking-brand text-cream/40">Step {step + 1} of {SETUP_STEPS.length}</span>
            {step < last ? (
              <button onClick={() => setStep((s) => Math.min(last, s + 1))} className={btnGold}>Next →</button>
            ) : (
              <a href="/admin" className={btnGold}>Open admin →</a>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-3xl font-bold text-cream">{children}</h1>;
}
function Lede({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 font-body text-cream/65">{children}</p>;
}
function CopyBtn({ id, text, copy, copied }: { id: string; text: string; copy: (t: string, k: string) => void; copied: string }) {
  return (
    <button onClick={() => copy(text, id)} className={btnGhost}>{copied === id ? "Copied ✓" : "Copy"}</button>
  );
}
function CodeBlock({ id, code, copy, copied }: { id: string; code: string; copy: (t: string, k: string) => void; copied: string }) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-cream/10 bg-forest-950">
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-cream/85"><code>{code}</code></pre>
      <div className="absolute right-2 top-2"><CopyBtn id={id} text={code} copy={copy} copied={copied} /></div>
    </div>
  );
}

function Welcome() {
  return (
    <div>
      <H>Set up {BRAND.name}</H>
      <Lede>
        This wizard walks you through configuring your shop, connecting Firebase, locking the
        security rules, and going live — about 10 minutes. {BRAND.name} already runs in demo mode
        with zero config, so you can explore first and configure when ready.
      </Lede>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { t: "A Google account", d: "Becomes your admin / owner login." },
          { t: "A Firebase project", d: "Free tier — accounts + data store." },
          { t: "~10 minutes", d: "Mostly copy-paste. We generate the rest." },
        ].map((x) => (
          <div key={x.t} className={cardCls}>
            <p className="font-body text-sm font-bold text-cream">{x.t}</p>
            <p className="mt-1 font-body text-[13px] text-cream/55">{x.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">The surfaces you are configuring</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SURFACES.map((s) => (
          <a key={s.path} href={s.path} className="flex items-start gap-3 rounded-xl border border-cream/10 p-3 transition-colors hover:border-gold-500/40">
            <span className="mt-0.5 rounded-md bg-forest-850 px-2 py-0.5 font-mono text-[11px] text-gold-400">{s.path}</span>
            <span className="min-w-0">
              <span className="block font-body text-sm font-bold text-cream">{s.name} <span className="font-normal text-cream/40">· {s.audience}</span></span>
              <span className="block font-body text-[12px] text-cream/55">{s.blurb}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FieldInput({ k, cfg, set }: { k: string; cfg: Record<string, string>; set: (k: string, v: string) => void }) {
  const f = CONFIG_FIELDS.find((x) => x.key === k)!;
  return (
    <label className="block">
      <span className="font-body text-[12px] font-bold text-cream/70">{f.label}{f.optional && <span className="ml-1 font-normal text-cream/35">optional</span>}</span>
      <input
        className={`mt-1.5 ${field}`}
        type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
        value={cfg[k] ?? ""}
        placeholder={f.def}
        onChange={(e) => set(k, e.target.value)}
        aria-label={f.label}
      />
      {f.hint && <span className="mt-1 block font-body text-[11px] text-cream/40">{f.hint}</span>}
    </label>
  );
}

function FormGroups({ groups, cfg, set, envBlock, copy, copied }: { groups: ConfigGroup[]; cfg: Record<string, string>; set: (k: string, v: string) => void; envBlock: string; copy: (t: string, k: string) => void; copied: string }) {
  return (
    <div>
      <H>Brand & business</H>
      <Lede>Everything here is config — no code edits. Fill what you like; sensible demo defaults apply to the rest. The generated <code className="text-gold-400">.env</code> block updates live below.</Lede>
      {groups.map((g) => (
        <div key={g} className="mt-6">
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">{g}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {CONFIG_FIELDS.filter((f) => f.group === g).map((f) => (
              <FieldInput key={f.key} k={f.key} cfg={cfg} set={set} />
            ))}
          </div>
        </div>
      ))}
      <EnvOutput envBlock={envBlock} copy={copy} copied={copied} />
    </div>
  );
}

function EnvOutput({ envBlock, copy, copied }: { envBlock: string; copy: (t: string, k: string) => void; copied: string }) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Your .env.local</p>
        <CopyBtn id="env" text={envBlock} copy={copy} copied={copied} />
      </div>
      <p className="mt-1 font-body text-[12px] text-cream/50">Paste into <code className="text-gold-400">.env.local</code> (and your host&rsquo;s env vars), or run <code className="text-gold-400">npm run setup</code> to be prompted for these.</p>
      <CodeBlock id="env2" code={envBlock} copy={copy} copied={copied} />
    </div>
  );
}

function Firebase({ cfg, set, envBlock, copy, copied, firebaseEnabled, pasteFill, connectThisDevice, disconnect }: {
  cfg: Record<string, string>;
  set: (k: string, v: string) => void;
  envBlock: string;
  copy: (t: string, k: string) => void;
  copied: string;
  firebaseEnabled: boolean;
  pasteFill: (text: string) => void;
  connectThisDevice: () => string;
  disconnect: () => void;
}) {
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState("");
  const steps = [
    "Go to console.firebase.google.com → Add project (sign in with your Google account; name it anything).",
    "Click the Web icon (</>) → register an app → copy the firebaseConfig.",
    "Build → Authentication → Get started → enable Google + Email/Password.",
    "Authentication → Settings → Authorized domains → add this app’s domain.",
    "Build → Firestore Database → Create database (Production mode).",
    "Firestore → Rules → paste your rules (Admin step) → Publish.",
  ];
  return (
    <div>
      <H>Connect Firebase</H>
      <Lede>Each shop connects its own free Firebase — it powers Google sign-in and the data store. The keys are public by design; security comes from the rules.</Lede>
      <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 font-body text-[11px] font-bold ${firebaseEnabled ? "bg-emerald-500/15 text-emerald-500" : "bg-gold-500/15 text-gold-400"}`}>
        <span className="h-2 w-2 rounded-full" style={{ background: "currentColor" }} />
        {firebaseEnabled ? "Connected on this device." : "Not connected yet — running in demo mode."}
      </div>

      {firebaseEnabled ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-forest-900/60 p-5">
          <p className="font-body text-sm font-bold text-cream">This device is connected to Firebase.</p>
          <p className="mt-1 font-body text-[12px] text-cream/55">Sign in with Google on the Admin step (or any admin surface). To point this device at a different project, disconnect first.</p>
          <button onClick={disconnect} className={`mt-3 ${btnGhost}`}>Disconnect this device</button>
        </div>
      ) : (
        <>
          <ol className="mt-6 space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 font-body text-[14px] text-cream/75">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold-500/50 text-[11px] font-bold text-gold-400">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6">
            <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Paste your firebaseConfig</p>
            <p className="mt-1 font-body text-[12px] text-cream/50">Paste the whole block from the Firebase console — we&rsquo;ll fill the fields below.</p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={5}
              placeholder={'const firebaseConfig = {\n  apiKey: "AIza…",\n  projectId: "your-project",\n  …\n}'}
              className={`mt-2 ${field} font-mono text-[12px]`}
              aria-label="Paste firebaseConfig"
            />
            <button onClick={() => pasteFill(paste)} className={`mt-2 ${btnGhost}`}>Fill fields from paste</button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CONFIG_FIELDS.filter((f) => f.group === "Firebase").map((f) => (
              <FieldInput key={f.key} k={f.key} cfg={cfg} set={set} />
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-gold-500/30 bg-forest-900/60 p-5">
            <p className="font-body text-sm font-bold text-cream">Connect this device</p>
            <p className="mt-1 font-body text-[12px] text-cream/55">Saves the config above on <span className="text-gold-400">this device</span> (no rebuild) and reloads so Google login works. Set your admin email on the Admin step first.</p>
            <button onClick={() => setErr(connectThisDevice())} className={`mt-3 ${btnGold}`}>Connect &amp; reload</button>
            {err && <p className="mt-2 font-body text-[12px] text-red-300">{err}</p>}
          </div>

          <EnvOutput envBlock={envBlock} copy={copy} copied={copied} />
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: "ok" | "todo" | "warn" }) {
  const map = {
    ok: { c: "bg-emerald-500/15 text-emerald-500", t: "Ready" },
    warn: { c: "bg-gold-500/15 text-gold-400", t: "Check" },
    todo: { c: "bg-cream/10 text-cream/50", t: "To do" },
  }[status];
  return <span className={`rounded-full px-2.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-brand ${map.c}`}>{map.t}</span>;
}

function Admin({ adminRaw, set, rulesSnippet, copy, copied, check }: { adminRaw: string; set: (k: string, v: string) => void; rulesSnippet: string; copy: (t: string, k: string) => void; copied: string; check: CheckState }) {
  return (
    <div>
      <H>Admin & security rules</H>
      <Lede>Your Google account becomes the owner. {BRAND.name} drives every admin check from a single <code className="text-gold-400">isAdmin()</code> function in <code className="text-gold-400">firestore.rules</code> — set it once.</Lede>

      <div className="mt-6 max-w-md">
        <FieldInput k="NEXT_PUBLIC_ADMIN_EMAILS" cfg={{ NEXT_PUBLIC_ADMIN_EMAILS: adminRaw }} set={set} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="font-body text-[12px] text-cream/60">Live status:</span>
        <span className="inline-flex items-center gap-2"><StatusPill status={check.firebaseEnabled ? "ok" : "todo"} /> <span className="font-body text-[12px] text-cream/60">Firebase</span></span>
        <span className="inline-flex items-center gap-2"><StatusPill status={check.signedIn ? (check.isCurrentAdmin ? "ok" : "warn") : "todo"} /> <span className="font-body text-[12px] text-cream/60">{check.signedIn ? (check.isCurrentAdmin ? "You are an admin" : "Signed in, not an admin") : "Not signed in"}</span></span>
      </div>

      <div className="mt-6">
        <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Paste into firestore.rules</p>
        <p className="mt-1 font-body text-[12px] text-cream/50">Replace the existing <code className="text-gold-400">isAdmin()</code> with this, then deploy.</p>
        <CodeBlock id="rules" code={rulesSnippet} copy={copy} copied={copied} />
      </div>

      <div className="mt-6">
        <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Deploy the rules</p>
        <CodeBlock id="deploy" code={"npm run check:setup   # verify everything\nnpm run firebase:deploy   # publish rules + indexes"} copy={copy} copied={copied} />
      </div>
    </div>
  );
}

function Services({ cfg, set, genToken, envBlock, copy, copied }: { cfg: Record<string, string>; set: (k: string, v: string) => void; genToken: () => void; envBlock: string; copy: (t: string, k: string) => void; copied: string }) {
  return (
    <div>
      <H>Optional services</H>
      <Lede>All optional — skip any of these. These are <span className="text-gold-400">server-only secrets</span>: keep them out of <code className="text-gold-400">NEXT_PUBLIC_*</code> and never commit them.</Lede>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CONFIG_FIELDS.filter((f) => f.group === "Optional").map((f) => (
          <div key={f.key}>
            <FieldInput k={f.key} cfg={cfg} set={set} />
            {f.key === "SHOPSENSE_INGEST_TOKEN" && (
              <button onClick={genToken} className={`mt-2 ${btnGhost}`}>Generate secure token</button>
            )}
          </div>
        ))}
      </div>
      <EnvOutput envBlock={envBlock} copy={copy} copied={copied} />
    </div>
  );
}

function GoLive({ check, copy, copied }: { check: CheckState; copy: (t: string, k: string) => void; copied: string }) {
  const list = buildChecklist(check);
  const done = list.filter((i) => i.status === "ok").length;
  return (
    <div>
      <H>Go live</H>
      <Lede>{done} of {list.length} live checks ready. The rest are quick. When green, deploy and open your counter.</Lede>

      <div className="mt-6 space-y-2">
        {list.map((i) => (
          <div key={i.label} className="flex items-start justify-between gap-3 rounded-xl border border-cream/10 p-3">
            <div className="min-w-0">
              <p className="font-body text-sm font-bold text-cream">{i.label}</p>
              <p className="font-body text-[12px] text-cream/55">{i.hint}</p>
            </div>
            <StatusPill status={i.status} />
          </div>
        ))}
      </div>

      <p className="mt-8 font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Manual steps to confirm</p>
      <ul className="mt-3 space-y-2">
        {MANUAL_REMINDERS.map((m) => (
          <li key={m.label} className="rounded-xl border border-cream/10 p-3">
            <p className="font-body text-sm font-bold text-cream">{m.label}</p>
            <p className="font-body text-[12px] text-cream/55">{m.detail}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Run it</p>
        <CodeBlock id="run" code={"npm run check:setup     # confirm config\nnpm run firebase:deploy # publish rules\nnpm run dev             # or deploy to your host"} copy={copy} copied={copied} />
      </div>

      <p className="mt-8 font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Open your surfaces</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SURFACES.map((s) => (
          <a key={s.path} href={s.path} className="flex items-center justify-between rounded-xl border border-cream/10 p-3 transition-colors hover:border-gold-500/40">
            <span className="font-body text-sm font-bold text-cream">{s.name}</span>
            <span className="font-mono text-[11px] text-gold-400">{s.path}</span>
          </a>
        ))}
      </div>

      <p className="mt-8 font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Docs & help</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DOCS.map((d) => (
          <div key={d.file} className="rounded-xl border border-cream/10 p-3">
            <p className="font-body text-sm font-bold text-cream">{d.title} <span className="font-mono text-[11px] font-normal text-gold-400">{d.file}</span></p>
            <p className="font-body text-[12px] text-cream/55">{d.blurb}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Troubleshooting</p>
      <div className="mt-3 space-y-2">
        {TROUBLESHOOTING.map((t) => (
          <details key={t.q} className="rounded-xl border border-cream/10 p-3">
            <summary className="cursor-pointer font-body text-sm font-bold text-cream">{t.q}</summary>
            <p className="mt-2 font-body text-[13px] text-cream/60">{t.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
