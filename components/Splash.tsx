"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import BrewLoader from "./BrewLoader";

/* Intro splash — the brewing animation plays on EVERY full page load
   (a ritual, not a one-off), then fades out and leaves the DOM. */
export default function Splash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    // code-level signature — every console tells you what powers this storefront
    console.info(
      `%c☕ ${BRAND.business.name} %c powered by ${BRAND.name} · open-sourced by ${BRAND.author} · ${BRAND.authorUrl}`,
      "background:#0D0E08;color:#B59556;font-weight:bold;padding:4px 8px;border-radius:4px 0 0 4px",
      "background:#0D0E08;color:#00f0ff;padding:4px 8px;border-radius:0 4px 4px 0"
    );
    const t = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <div className="splash-fade fixed inset-0 z-[100]">
      <BrewLoader tagline={BRAND.business.tagline} />
    </div>
  );
}
