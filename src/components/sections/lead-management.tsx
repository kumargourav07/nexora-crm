"use client";

import * as React from "react";
import { ArrowRight, Target, Zap, UserPlus, LineChart } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadPipeline } from "./lead-pipeline";

const LEAD_FEATURE_POINTS = [
  {
    icon: Target,
    title: "Centralized lead pipeline",
    desc: "Aggregate inbound leads from Meta, Google, website forms, and WhatsApp automatically.",
  },
  {
    icon: Zap,
    title: "Automated follow-ups",
    desc: "Trigger instant email, WhatsApp, or SMS sequences before leads turn cold.",
  },
  {
    icon: UserPlus,
    title: "Intelligent lead assignment",
    desc: "Route deals by rep availability, deal value, geography, or round-robin logic.",
  },
  {
    icon: LineChart,
    title: "Real-time conversion tracking",
    desc: "Pinpoint drop-offs and track pipeline velocity at every stage with clear ROI visibility.",
  },
];

export function LeadManagement() {
  return (
    <section id="lead-management" className="relative py-16 md:py-24 scroll-mt-20">
      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left: Text & Storytelling (~45%) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
                  01 / LEAD MANAGEMENT
                </span>
              </div>
              <Badge variant="primary" size="md" dot>
                LEAD MANAGEMENT
              </Badge>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Turn every lead into an opportunity.
              </h3>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Capture, organize, assign, track, and convert leads without losing them across spreadsheets and disconnected tools.
            </p>

            {/* 4 Feature Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 pt-2">
              {LEAD_FEATURE_POINTS.map((pt) => (
                <div key={pt.title} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary mt-0.5">
                    <pt.icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {pt.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {pt.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  const el = document.getElementById("contact");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="shadow-md shadow-primary/20 hover:shadow-primary/30"
              >
                Explore Lead Management
              </Button>
            </div>
          </div>

          {/* Right: Lead Pipeline Visual Mockup (~55%) */}
          <div className="lg:col-span-7 w-full">
            <LeadPipeline />
          </div>
        </div>
      </Container>
    </section>
  );
}
