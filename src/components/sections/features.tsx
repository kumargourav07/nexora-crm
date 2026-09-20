import * as React from "react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { LeadManagement } from "./lead-management";
import { Hrms } from "./hrms";
import { Invoicing } from "./invoicing";

export function Features() {
  return (
    <div id="features" className="relative scroll-mt-16">
      {/* Features Section Intro Header */}
      <section className="pt-20 pb-8 md:pt-28 md:pb-12 text-center">
        <Container size="xl">
          <SectionHeading
            eyebrow="POWERFUL PLATFORM"
            title="Run your business from one place."
            description="NEXORA connects your sales, people, and billing workflows into one streamlined platform."
            align="center"
          />
        </Container>
      </section>

      {/* Feature 1: Lead Management */}
      <LeadManagement />

      {/* Feature 2: HRMS (Elevated Surface) */}
      <Hrms />

      {/* Feature 3: Invoicing */}
      <Invoicing />
    </div>
  );
}
