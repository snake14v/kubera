import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CareersContent from "@/components/CareersContent";

export const metadata: Metadata = {
  title: `Careers — ${BRAND.business.name}`,
  description: `We're hiring. Join the ${BRAND.business.name} team in your neighbourhood — baristas, floor, kitchen and shift leads.`,
};

export default function CareersPage() {
  return (
    <main>
      <Nav />
      <CareersContent />
      <Footer />
    </main>
  );
}
