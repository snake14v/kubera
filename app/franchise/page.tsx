import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FranchiseContent from "@/components/FranchiseContent";

export const metadata: Metadata = {
  title: "Franchise — Orbéan Coffee",
  description:
    "Bring Orbéan to your city. A premium coffee & juice house franchise — brand, recipes, training and supply, with real support from launch.",
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
