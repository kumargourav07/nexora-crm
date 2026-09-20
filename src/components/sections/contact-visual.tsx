"use client";

import * as React from "react";
import { Users, UserCheck, Receipt, Network, CheckCircle2, Zap } from "lucide-react";
import { gsap } from "@/lib/animations/gsap";

const WORKSPACE_MODULES = [
  {
    id: "leads",
    title: "Leads & Sales",
    metric: "1,248 Active",
    icon: Users,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
  },
  {
    id: "hrms",
    title: "HRMS & Teams",
    metric: "98.4% Present",
    icon: UserCheck,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    glow: "shadow-sky-500/10",
  },
  {
    id: "billing",
    title: "Invoicing & GST",
    metric: "Automated",
    icon: Receipt,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    glow: "shadow-indigo-500/10",
  },
  {
    id: "integrations",
    title: "Lead Connectors",
    metric: "8 Sources Synced",
    icon: Network,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/10",
  },
];

export function ContactVisual() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
          once: true,
        },
      });

      tl.fromTo(
        ".contact-center-hub",
        { scale: 0.88, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.4)" }
      )
        .fromTo(
          ".contact-module-node",
          { y: 15, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.45,
            stagger: 0.08,
            ease: "power2.out",
          },
          "-=0.2"
        )
        .fromTo(
          ".contact-live-pill",
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power1.out" },
          "-=0.1"
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-border/80 bg-gradient-to-b from-card/80 to-surface/90 p-5 sm:p-6 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden"
    >
      {/* Background ambient radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-3xl pointer-events-none -z-10 rounded-full"
        aria-hidden="true"
      />

      {/* Header tag */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary text-xs font-mono font-bold">
            ◈
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            360° Workspace Engine
          </span>
        </div>
        <div className="contact-live-pill flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-Time Sync</span>
        </div>
      </div>

      {/* Central Hub & Connected Modules layout */}
      <div className="space-y-4">
        {/* Central NEXORA Hub */}
        <div className="contact-center-hub relative rounded-xl border border-primary/30 bg-primary/10 p-3.5 sm:p-4 text-center shadow-md shadow-primary/10">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-bold tracking-tight text-foreground">
              NEXORA Core Platform
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Single unified source of truth for your entire business
          </p>
        </div>

        {/* 2x2 Grid of Connected Modules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {WORKSPACE_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <div
                key={module.id}
                className={`contact-module-node group relative rounded-xl border ${module.border} ${module.bg} p-3 transition-all duration-200 hover:border-border-strong hover:bg-surface-elevated shadow-sm ${module.glow}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${module.border} bg-background/80 ${module.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {module.title}
                      </span>
                      <CheckCircle2 className="h-3 w-3 text-emerald-400/80 shrink-0 ml-1" />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                      {module.metric}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Summary Strip */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Zero siloed databases</span>
        <span className="text-foreground/80 font-medium">Automatic data propagation</span>
      </div>
    </div>
  );
}
