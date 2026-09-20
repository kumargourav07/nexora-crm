import { Navbar, Footer } from "@/components/layout";
import {
  Hero,
  CapabilityStrip,
  Features,
  Integrations,
  Benefits,
  FinalCta,
  Contact,
} from "@/components/sections";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Fixed Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1">
        {/* 1. Hero Section with CRM Dashboard */}
        <Hero />

        {/* 2. Trust & Capability Strip */}
        <CapabilityStrip />

        {/* 3. Core Product Features (Lead Management, HRMS, Invoicing) */}
        <Features />

        {/* 4. Connected Ecosystem (Integrations & Connectors) */}
        <Integrations />

        {/* 5. Why Choose NEXORA / Key Benefits */}
        <Benefits />

        {/* 6. Final Call to Action */}
        <FinalCta />

        {/* 7. Contact / Get a Demo Form */}
        <Contact />
      </main>

      {/* Global Site Footer */}
      <Footer />
    </div>
  );
}
