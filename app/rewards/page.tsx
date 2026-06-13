import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import RewardsContent from "@/components/RewardsContent";

export const metadata: Metadata = {
  title: "Rewards — Orbéan Coffee",
  description:
    "Join Orbéan Rewards. Every cup earns points toward free drinks. Sign in with Google, show your member QR at the bar, and climb from Bean to Gold.",
};

export default function RewardsPage() {
  return (
    <main>
      <Nav />
      <RewardsContent />
      <Footer />
    </main>
  );
}
