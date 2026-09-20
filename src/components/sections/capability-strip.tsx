import * as React from "react";
import {
  Users,
  Building2,
  Receipt,
  Layers,
  BarChart3,
  Zap,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  {
    name: "Lead Management",
    description: "Omnichannel capture & pipeline routing",
    icon: Users,
    color: "text-blue-400",
  },
  {
    name: "HRMS & Workforce",
    description: "Attendance, payroll & permissions",
    icon: Building2,
    color: "text-indigo-400",
  },
  {
    name: "Smart Invoicing",
    description: "Automated GST billing & collections",
    icon: Receipt,
    color: "text-emerald-400",
  },
  {
    name: "Integrations",
    description: "WhatsApp, Meta Ads, Zapier & more",
    icon: Layers,
    color: "text-sky-400",
  },
  {
    name: "360° Analytics",
    description: "Real-time revenue & team velocity",
    icon: BarChart3,
    color: "text-amber-400",
  },
  {
    name: "Workflow Automation",
    description: "Zero-code triggers & event hooks",
    icon: Zap,
    color: "text-violet-400",
  },
];

export function CapabilityStrip() {
  return (
    <section id="platform" className="relative py-12 md:py-16 border-y border-border/60 bg-surface/40 backdrop-blur-sm scroll-mt-20">
      <Container size="xl" className="space-y-8">
        {/* Strip Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
            UNIFIED 360° ARCHITECTURE
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Everything your business needs. One connected platform.
          </h2>
        </div>

        {/* 6 Capability Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.name}
              className={cn(
                "group rounded-xl border border-border/70 bg-card/60 p-4 space-y-2.5",
                "transition-all duration-200 hover:border-primary/40 hover:bg-surface-elevated/80 hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated border border-border/60 transition-colors group-hover:border-primary/30",
                    cap.color
                  )}
                >
                  <cap.icon className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {cap.name}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {cap.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
