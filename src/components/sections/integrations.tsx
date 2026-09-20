import * as React from "react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { INTEGRATIONS_LIST } from "@/lib/constants/integrations";
import { IntegrationNetwork } from "./integration-network";
import { IntegrationCard } from "./integration-card";
import { Zap } from "lucide-react";

export function Integrations() {
  return (
    <section
      id="integrations"
      className="relative py-20 md:py-28 bg-surface/20 border-t border-border/50 scroll-mt-20 overflow-hidden"
    >
      {/* Subtle Background Pattern & Glow */}
      <div
        className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <Container size="xl" className="relative z-10 space-y-16 sm:space-y-20">
        {/* Section Intro Heading */}
        <SectionHeading
          eyebrow="CONNECTED ECOSYSTEM"
          title="Every lead source. One pipeline."
          description="Bring leads from the platforms your business already uses directly into NEXORA CRM — automatically and without manual data entry."
          align="center"
        />

        {/* Primary Interactive Network Visual */}
        <IntegrationNetwork />

        {/* Integration Detail Cards Subsection */}
        <div className="space-y-8 pt-6 border-t border-border/60">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Connect the tools your team already uses.
            </h3>
            <p className="text-sm text-muted-foreground">
              Stop chasing leads across disconnected platforms. Bring them into one unified pipeline.
            </p>
          </div>

          {/* 8 Integration Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTEGRATIONS_LIST.map((item) => (
              <IntegrationCard key={item.id} integration={item} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
