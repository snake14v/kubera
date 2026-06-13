import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Splash from "@/components/Splash";
import Story from "@/components/Story";
import Sourcing from "@/components/Sourcing";
import Menu from "@/components/Menu";
import Gallery from "@/components/Gallery";
import Visit from "@/components/Visit";
import Launch from "@/components/Launch";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";

// Storefront structured data is injected site-wide from app/layout.tsx
// (CafeOrCoffeeShop, sourced from BRAND.business).

export default function Page() {
  return (
    <main>
      <Splash />
      <Nav />
      <Hero />
      <Story />
      <Sourcing />
      <Menu />
      <Gallery />
      <Visit />
      <Launch />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
