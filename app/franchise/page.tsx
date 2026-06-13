import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FranchiseContent from "@/components/FranchiseContent";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Franchise — ${BRAND.business.name}`,
  description:
    `Bring ${BRAND.business.name} to your city. A premium coffee & juice house franchise — brand, recipes, training and supply, with real support from launch.`,
};

export default function FranchisePage() {
  return (
    <main>
      <Nav />
      <FranchiseContent />
      <Footer />
    </main>
  );
}
