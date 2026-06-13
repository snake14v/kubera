import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";

// Pinned viewport — table-QR opens were getting random zoom on some phones
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0D0E08",
};
import { display, body, serif } from "@/lib/fonts";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const biz = BRAND.business;

export const metadata: Metadata = {
  title: `${biz.name} — order ahead, dine in & earn rewards`,
  description: `${biz.tagline} Order ahead, dine in, and earn rewards. Powered by ${BRAND.name}, the open-source point of sale.`,
  applicationName: biz.name,
  metadataBase: new URL(biz.url),
  manifest: "/manifest.json",
  openGraph: {
    title: biz.name,
    description: biz.tagline,
    type: "website",
    url: biz.url,
    siteName: biz.name,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: biz.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: biz.name,
    description: biz.tagline,
    images: ["/og.jpg"],
  },
  // engineering credit — Kubera is the engine; Oorulogix open-sourced it
  authors: [{ name: BRAND.author, url: BRAND.authorUrl }],
  creator: BRAND.author,
  generator: BRAND.name,
  other: { copyright: `© ${new Date().getFullYear()} ${biz.name} · powered by ${BRAND.name}, open-sourced by ${BRAND.author} (${BRAND.license})` },
};

// Structured data: marks this as a café/coffee shop with an address so it can
// earn a rich result + Maps panel. Sourced from BRAND.business — a deployer's
// real details flow in via env; the demo defaults are harmless placeholders.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  name: biz.name,
  description: biz.tagline,
  url: biz.url,
  ...(biz.phone ? { telephone: biz.phone } : {}),
  priceRange: biz.currency + biz.currency,
  address: {
    "@type": "PostalAddress",
    streetAddress: biz.addressLine1,
    addressLocality: biz.addressLine2,
  },
  ...(biz.instagram ? { sameAs: [`https://www.instagram.com/${biz.instagram}`] } : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${serif.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
