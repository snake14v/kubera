"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { firebaseEnabled } from "@/lib/firebase";
import { isSetupSkipped } from "@/lib/runtimeConfig";
import { useMounted } from "@/lib/useMounted";

// First-run gate for the distributable build: if this install has no Firebase
// configured (no env, no saved per-device config) and the user hasn't chosen to
// explore the demo, send them to the /setup wizard. Renders nothing and only
// acts in a post-mount effect, so it never affects SSR/hydration.
export default function FirstRunGate() {
  const mounted = useMounted();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!mounted) return;
    if (firebaseEnabled) return; // already configured (env or per-device)
    if (isSetupSkipped()) return; // user chose to explore the demo
    if (pathname && pathname.startsWith("/setup")) return; // already there
    router.replace("/setup");
  }, [mounted, pathname, router]);

  return null;
}
