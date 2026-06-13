"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AuthPanel from "@/components/AuthPanel";
import Reveal from "@/components/Reveal";
import { Eyebrow } from "@/components/ui";
import { OrbitRings } from "@/components/Decor";
import { auth } from "@/lib/firebase";
import { BRAND } from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setSignedIn(true);
        router.replace("/rewards");
      }
    });
  }, [router]);

  return (
    <main>
      <Nav />
      <section className="relative overflow-hidden bg-forest-950">
        <OrbitRings className="pointer-events-none absolute -right-28 -top-20 h-[480px] w-[480px] text-gold-500" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 25% 30%, rgba(181,149,86,0.1), transparent 60%)" }}
        />
        <div className="relative mx-auto grid min-h-[70vh] max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Your {BRAND.business.name} account</Eyebrow>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-cream sm:text-5xl">
              One account.
              <br />
              <span className="rgb-text">Every perk.</span>
            </h1>
            <p className="mt-5 max-w-md font-body text-lg font-light text-cream/70">
              Sign in or create your account — it&rsquo;s your Rewards card, your
              member QR, and your spot on the opening-day list.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            {signedIn ? (
              <p className="font-body text-cream/60">Signed in — taking you to your Rewards…</p>
            ) : (
              <AuthPanel onDone={() => router.replace("/rewards")} />
            )}
          </Reveal>
        </div>
      </section>
      <Footer />
    </main>
  );
}
