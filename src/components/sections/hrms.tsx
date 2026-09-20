"use client";

import * as React from "react";
import { ArrowRight, Users, Clock, Calendar, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HrmsDashboard } from "./hrms-dashboard";

const HRMS_FEATURE_POINTS = [
  {
    icon: Users,
    title: "Unified employee records",
    desc: "Single source of truth for contracts, compensation, emergency contacts, and documents.",
  },
  {
    icon: Clock,
    title: "Automated attendance tracking",
    desc: "Seamless geo-fencing, web clock-ins, biometric sync, and shift management.",
  },
  {
    icon: Calendar,
    title: "One-click leave management",
    desc: "Multi-level leave approval hierarchies, holiday calendars, and balance accrual.",
  },
  {
    icon: ShieldCheck,
    title: "Granular team permissions",
    desc: "Role-based access controls to protect sensitive payroll and employee records.",
  },
];

export function Hrms() {
  return (
    <section
      id="hrms"
      className="relative py-16 md:py-24 bg-surface/30 border-y border-border/50 scroll-mt-20"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left on Desktop: HRMS Visual (~55%) - Inverted Rhythm */}
          <div className="lg:col-span-7 order-2 lg:order-1 w-full">
            <HrmsDashboard />
          </div>

          {/* Right on Desktop: Text & Storytelling (~45%) */}
          <div className="lg:col-span-5 order-1 lg:order-2 space-y-6 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
                  02 / HRMS
                </span>
              </div>
              <Badge variant="primary" size="md" dot>
                HRMS &amp; WORKFORCE
              </Badge>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Your people, organized.
              </h3>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Manage employees, attendance, leave requests, and everyday HR workflows from the same unified platform without switching between disconnected spreadsheets.
            </p>

            {/* 4 Feature Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 pt-2">
              {HRMS_FEATURE_POINTS.map((pt) => (
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
                Explore HRMS
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
