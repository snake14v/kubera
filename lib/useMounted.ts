"use client";

import { useEffect, useState } from "react";

/** False during SSR and the first client paint, true after mount. Use it to
 *  gate UI that depends on per-device runtime config (lib/runtimeConfig.ts) so
 *  the server and first client render agree — avoiding hydration mismatches. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
