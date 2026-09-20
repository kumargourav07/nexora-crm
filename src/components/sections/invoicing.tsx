"use client";

import * as React from "react";
import { ArrowRight, FileText, CheckCircle2, History, BarChart2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceDashboard } from "./invoice-dashboard";

const INVOICE_FEATURE_POINTS = [
  {
    icon: FileText,
    title: "GST-compliant invoicing",
    desc: "Generate professional recurring and one-off invoices with custom branding and automated tax calculations.",
  },
  {
    icon: CheckCircle2,
    title: "Automated payment tracking",
    desc: "Instantly reconcile incoming bank transfers, UPI payments, and payment gateway webhooks.",
  },
  {
    icon: History,
    title: "Complete audit & billing history",
    desc: "Maintain a clear timeline of issued invoices, overdue notices, and transaction receipts per customer.",
  },
  {
    icon: BarChart2,
    title: "Real-time revenue visibility",
    desc: "Monitor accounts receivable, cash flow velocity, and aging buckets on an executive dashboard.",
  },
];

export function Invoicing() {
  return (
    <section id="invoicing" className="relative py-16 md:py-24 scroll-mt-20">
      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left: Text & Storytelling (~45%) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
                  03 / INVOICING
                </span>
              </div>
              <Badge variant="primary" size="md" dot>
                SMART INVOICING
              </Badge>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Billing without the busywork.
              </h3>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Create professional invoices, track payments, and keep customer billing organized without switching between disconnected finance tools.
            </p>

            {/* 4 Feature Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 pt-2">
              {INVOICE_FEATURE_POINTS.map((pt) => (
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
                Explore Invoicing
              </Button>
            </div>
          </div>

          {/* Right: Invoice Dashboard Visual Mockup (~55%) */}
          <div className="lg:col-span-7 w-full">
            <InvoiceDashboard />
          </div>
        </div>
      </Container>
    </section>
  );
}
