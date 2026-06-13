import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND } from "@/lib/brand";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import OrderContent from "@/components/order/OrderContent";

export const metadata: Metadata = {
  title: `Order — ${BRAND.business.name}`,
  description: `Order from ${BRAND.business.name} to your table, for pickup, or local delivery in your neighbourhood — signature matcha, lattes and cold-pressed juices.`,
};

export default function OrderPage() {
  return (
    <main>
      <Nav />
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center font-body text-cream/50">Loading menu…</div>}>
        <OrderContent />
      </Suspense>
      <Footer />
    </main>
  );
}
