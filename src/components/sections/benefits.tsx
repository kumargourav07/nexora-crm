import * as React from "react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { UnifiedPlatform } from "./unified-platform";
import { BenefitGrid } from "./benefit-grid";

export function Benefits() {
  return (
    <section
      id="benefits"
      className="relative py-20 md:py-28 bg-surface/20 border-t border-border/50 scroll-mt-20 overflow-hidden"
    >
      {/* Background Subtle Ambient Grid */}
      <div
        className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"
        aria-hidden="true"
      />

      <Container size="xl" className="relative z-10 space-y-16 sm:space-y-20">
        {/* Section Intro Heading */}
        <SectionHeading
          eyebrow="WHY NEXORA"
          title="Everything connected. Nothing scattered."
          description="Bring sales, people, billing, and lead sources into one connected workspace designed to help your team move faster."
          align="center"
        />

        {/* 1. Primary Unified Platform Visualization */}
        <UnifiedPlatform />

        {/* 2. Bento-Style Key Benefits Grid */}
        <BenefitGrid />
      </Container>
    </section>
  );
}
