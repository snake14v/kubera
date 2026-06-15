"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { BRAND } from "@/lib/brand";
import { auth, firebaseEnabled } from "@/lib/firebase";
import { useMounted } from "@/lib/useMounted";
import AuthPanel from "./AuthPanel";
import PageHeader from "./PageHeader";
import Reveal from "./Reveal";
import { Eyebrow } from "./ui";
import { FloatingDecor, OrbitRings } from "./Decor";
import { Steps } from "./animated";
import { CupIcon, SparkleIcon, BadgeIcon } from "./icons";

type Member = {
  configured: boolean;
  isMember?: boolean;
  email: string;
  name?: string;
  points?: number;
  totalSpent?: number;
  totalVisits?: number;
  memberCode?: string;
  tier?: { name: string; next?: string; toNext?: number };
  qr?: string;
};

const steps = [
  { icon: <CupIcon className="h-6 w-6" />, title: "Order at the bar", note: "Show your member QR at checkout." },
  { icon: <SparkleIcon className="h-6 w-6" />, title: "Earn points", note: "Every cup adds to your balance, automatically." },
  { icon: <BadgeIcon className="h-6 w-6" />, title: "Unlock rewards", note: "Climb from Bean to Brew to Gold." },
];

export default function RewardsContent() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const load = useCallback(async (u: User) => {
    setLoading(true);
    setError("");
    try {
      const idToken = await u.getIdToken();
      const res = await fetch("/api/loyalty/me", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load your rewards.");
      setMember(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your rewards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load(user);
    else setMember(null);
  }, [user, load]);

  const mounted = useMounted();

  return (
    <>
      <PageHeader
        eyebrow={`${BRAND.business.name} Rewards`}
        title={<>Good coffee, <span className="rgb-text">earned back.</span></>}
        intro={`Join ${BRAND.business.name} Rewards — every cup earns points toward free drinks. Sign in, show your QR at the bar, and watch it add up.`}
        image="/menu-lattes.jpg"
        decor={
          <>
            <FloatingDecor />
            <OrbitRings className="pointer-events-none absolute -right-24 -top-16 h-[440px] w-[440px] text-gold-500" />
          </>
        }
      />

      <section className="bg-forest-950 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          {(!mounted || !firebaseEnabled) ? (
            <Notice title="Rewards sign-in is being set up" body="Google sign-in needs the Firebase keys (see FIREBASE-SETUP.md). It'll be live shortly." />
          ) : !ready ? (
            <p className="font-body text-cream/50">Loading…</p>
          ) : !user ? (
            <Reveal>
              <div className="max-w-md">
                <h2 className="font-display text-3xl font-bold text-cream">Sign in to your card.</h2>
                <p className="mt-3 font-body text-cream/60">
                  Your account is your membership — points follow your email, in-store and here.
                </p>
                <div className="mt-6">
                  <AuthPanel />
                </div>
              </div>
            </Reveal>
          ) : loading ? (
            <p className="font-body text-cream/50">Loading your rewards…</p>
          ) : error ? (
            <Notice title="Hmm — that didn't load" body={error} />
          ) : member && member.configured === false ? (
            <Notice
              title={`You're in, ${firstName(member.name)} ✦`}
              body={`${BRAND.business.name} Rewards goes live with the shop${
                BRAND.business.opening ? ` — ${BRAND.business.opening}` : ""
              }. Your membership is saved to your Google account — points start the day we open.`}
            />
          ) : member ? (
            <MemberCard member={member} onSignOut={() => auth && signOut(auth)} />
          ) : null}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cream/10 bg-forest-900 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
              Sip. Earn. Repeat.
            </h2>
          </Reveal>
          <div className="mt-12">
            <Steps steps={steps} />
          </div>
        </div>
      </section>
    </>
  );
}

function MemberCard({ member, onSignOut }: { member: Member; onSignOut: () => void }) {
  const tier = member.tier?.name || "Bean";
  return (
    <Reveal>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Card */}
        <div className="rgb-ring relative overflow-hidden rounded-lg border border-gold-500/30 bg-gradient-to-br from-forest-850 to-forest-900 p-7 [box-shadow:0_0_50px_-16px_rgba(181,149,86,0.5)]">
          <OrbitRings className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 text-gold-500/40" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-cream">
                {BRAND.business.name.toUpperCase()}
                <span className="ml-2 align-middle font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">Rewards</span>
              </p>
              <p className="mt-1 font-body text-sm text-cream/60">{member.name}</p>
            </div>
            <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400">
              {tier} member
            </span>
          </div>

          <div className="relative mt-8">
            <p className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">Points balance</p>
            <p className="mt-1 font-display text-5xl font-bold text-gold-400 tabular-nums">{member.points ?? 0}</p>
            {member.tier?.toNext != null && member.tier.next && (
              <p className="mt-2 font-body text-sm text-cream/55">
                {member.tier.toNext} to <span className="text-gold-400">{member.tier.next}</span>
              </p>
            )}
          </div>

          <div className="relative mt-8 flex gap-8 border-t border-cream/10 pt-5">
            <Stat label="Visits" value={String(member.totalVisits ?? 0)} />
            <Stat label="Spent" value={`₹${member.totalSpent ?? 0}`} />
            <Stat label="Member" value={member.memberCode || "—"} />
          </div>
          <button onClick={onSignOut} className="relative mt-6 font-body text-[11px] font-bold uppercase tracking-brand text-cream/45 transition-colors hover:text-gold-400">
            Sign out
          </button>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-cream/10 bg-forest-850 p-7 text-center">
          <p className="font-body text-[11px] font-bold uppercase tracking-brand text-gold-500">Show at the bar</p>
          {member.qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.qr} alt={`Your ${BRAND.business.name} member QR`} className="mt-4 h-44 w-44 rounded-sm" />
          ) : (
            <div className="mt-4 flex h-44 w-44 items-center justify-center rounded-sm border border-cream/15 font-body text-sm text-cream/40">
              QR pending
            </div>
          )}
          <p className="mt-4 font-mono text-sm tracking-widest text-cream/70">{member.memberCode}</p>
          <p className="mt-1 font-body text-xs text-cream/40">The cashier scans this to add your points.</p>
        </div>
      </div>
    </Reveal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/40">{label}</p>
      <p className="mt-0.5 font-display text-base font-bold text-cream">{value}</p>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Reveal>
      <div className="max-w-xl rounded-sm border border-gold-500/30 bg-forest-900 p-7">
        <h2 className="font-display text-2xl font-bold text-cream">{title}</h2>
        <p className="mt-3 font-body text-cream/65">{body}</p>
      </div>
    </Reveal>
  );
}

function firstName(name?: string) {
  return (name || "").trim().split(/\s+/)[0] || "friend";
}
