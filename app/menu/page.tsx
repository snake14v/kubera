import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Menu from "@/components/Menu";

export const metadata: Metadata = {
  title: `Menu — ${BRAND.business.name}`,
  description: `The ${BRAND.business.name} menu — Signature Matcha Collection, signature lattes, macchiatos, classic coffee and cold-pressed juices. Crafted for the modern connoisseur.`,
};

export default function MenuPage() {
  return (
    <main>
      <Nav />
      <Menu />
      <Footer />
    </main>
  );
}
