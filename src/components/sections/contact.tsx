"use client";

import * as React from "react";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ContactVisual } from "./contact-visual";
import { DemoForm } from "@/components/forms/demo-form";

const PRODUCT_VALUE_POINTS = [
  "Capture and manage leads across every active channel",
  "Connect external lead sources in minutes with zero code",
  "Manage teams, attendance, and HR workflows seamlessly",
  "Create and automate GST-compliant invoices & billing",
];

export function Contact() {
  return (
    <section
      id="contact"
      className="relative py-20 md:py-28 bg-background border-t border-border/50 scroll-mt-20 overflow-hidden"
    >
      {/* Background Subtle Ambient Grid */}
      <div
        className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-primary/5 blur-[120px] pointer-events-none rounded-full -z-10"
        aria-hidden="true"
      />

      <Container size="xl" className="relative z-10 space-y-12 sm:space-y-16">
        {/* Section Intro Heading */}
        <SectionHeading
          eyebrow="GET A DEMO"
          title="Let's talk about your workflow."
          description="Tell us a little about your business and we'll show you how NEXORA can fit into your workflow."
          align="center"
        />

        {/* 2-Column Responsive Layout: Left (~45%) Product Visual & Info, Right (~55%) Demo Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Product Value & 360 Workspace Visual */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Zap className="h-3.5 w-3.5" />
                <span>NEXORA CRM</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                Built for teams that want sales and operations in one place.
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                See how replacing fragmented SaaS tools with an integrated 360° workspace accelerates lead velocity and reduces overhead.
              </p>
            </div>

            {/* Product Benefits Checklist */}
            <div className="rounded-xl border border-border/70 bg-surface/50 p-5 space-y-3.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What you will see in the demo:
              </h4>
              <ul className="space-y-2.5">
                {PRODUCT_VALUE_POINTS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactive 360 Workspace Visual Component */}
            <ContactVisual />

            {/* Support guarantee badge */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Dedicated onboarding specialist assigned to every demo session.</span>
            </div>
          </div>

          {/* Right Column: Demo Form Component */}
          <div className="lg:col-span-7 w-full">
            <DemoForm />
          </div>
        </div>
      </Container>
    </section>
  );
}
