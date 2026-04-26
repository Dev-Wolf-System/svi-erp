import { HeroSection } from "@/components/landing/hero-section";
import { ValuePropsSection } from "@/components/landing/value-props-section";
import { CatalogPreviewSection } from "@/components/landing/catalog-preview-section";
import { InvestmentSimulatorSection } from "@/components/landing/investment-simulator-section";
import { LocationsSection } from "@/components/landing/locations-section";
import { CtaPortalSection } from "@/components/landing/cta-portal-section";
import { Footer } from "@/components/landing/footer";
import { TopNav } from "@/components/landing/top-nav";

export default function HomePage() {
  return (
    <>
      <TopNav />
      <main className="overflow-x-clip">
        <HeroSection />
        <ValuePropsSection />
        <CatalogPreviewSection />
        <InvestmentSimulatorSection />
        <LocationsSection />
        <CtaPortalSection />
      </main>
      <Footer />
    </>
  );
}
