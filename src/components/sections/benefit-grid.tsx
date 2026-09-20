"use client";

import * as React from "react";
import { BenefitCard } from "./benefit-card";
import { BENEFITS_LIST } from "@/lib/constants/benefits";
import { LeadRevenueFlow } from "./lead-revenue-flow";
import { AnalyticsMini } from "./analytics-mini";
import { AutomationFlow } from "./automation-flow";
import { ScaleVisual } from "./scale-visual";
import { Users, Building, ShieldCheck, Layers, ArrowRight } from "lucide-react";
import { gsap } from "@/lib/animations/gsap";

export function BenefitGrid() {
  const gridRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".benefit-bento-card",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }, gridRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 sm:gap-6">
      {/* Benefit 2: Move Faster (Col Span 6 on desktop) */}
      <BenefitCard
        number={BENEFITS_LIST[1].number}
        eyebrow={BENEFITS_LIST[1].eyebrow}
        title={BENEFITS_LIST[1].title}
        description={BENEFITS_LIST[1].description}
        tag={BENEFITS_LIST[1].tag}
        className="lg:col-span-6"
      >
        <LeadRevenueFlow />
      </BenefitCard>

      {/* Benefit 3: Better Visibility (Col Span 6 on desktop) */}
      <BenefitCard
        number={BENEFITS_LIST[2].number}
        eyebrow={BENEFITS_LIST[2].eyebrow}
        title={BENEFITS_LIST[2].title}
        description={BENEFITS_LIST[2].description}
        tag={BENEFITS_LIST[2].tag}
        className="lg:col-span-6"
      >
        <AnalyticsMini />
      </BenefitCard>

      {/* Benefit 5: Less Manual Work (Col Span 6 on desktop) */}
      <BenefitCard
        number={BENEFITS_LIST[4].number}
        eyebrow={BENEFITS_LIST[4].eyebrow}
        title={BENEFITS_LIST[4].title}
        description={BENEFITS_LIST[4].description}
        tag={BENEFITS_LIST[4].tag}
        className="lg:col-span-6"
      >
        <AutomationFlow />
      </BenefitCard>

      {/* Benefit 4: Built to Scale (Col Span 6 on desktop) */}
      <BenefitCard
        number={BENEFITS_LIST[3].number}
        eyebrow={BENEFITS_LIST[3].eyebrow}
        title={BENEFITS_LIST[3].title}
        description={BENEFITS_LIST[3].description}
        tag={BENEFITS_LIST[3].tag}
        className="lg:col-span-6"
      >
        <ScaleVisual />
      </BenefitCard>

      {/* Benefit 6: Unified Operations (Full 12 cols span on desktop) */}
      <BenefitCard
        number={BENEFITS_LIST[5].number}
        eyebrow={BENEFITS_LIST[5].eyebrow}
        title={BENEFITS_LIST[5].title}
        description={BENEFITS_LIST[5].description}
        tag={BENEFITS_LIST[5].tag}
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/60 bg-surface/70 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Sales Team
            </div>
            <p className="text-[11px] text-muted-foreground">
              Live deals, stage velocity, and automated call notes.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface/70 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Building className="h-4 w-4 text-indigo-400" />
              HR &amp; People
            </div>
            <p className="text-[11px] text-muted-foreground">
              Staff presence, commission tiers, and role permissions.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface/70 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Finance &amp; Billing
            </div>
            <p className="text-[11px] text-muted-foreground">
              Instant GST invoices, payment receipts, and reconciliation.
            </p>
          </div>

          <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 space-y-1 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Layers className="h-4 w-4" />
              NEXORA Core
            </div>
            <p className="text-[11px] text-primary/80 font-medium flex items-center justify-between">
              <span>Synchronized Hub</span>
              <ArrowRight className="h-3 w-3" />
            </p>
          </div>
        </div>
      </BenefitCard>
    </div>
  );
}
