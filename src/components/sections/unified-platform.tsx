"use client";

import * as React from "react";
import {
  Target,
  Building2,
  Receipt,
  Layers,
  BarChart3,
  Zap,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/animations/gsap";

const PLATFORM_MODULES = [
  {
    name: "Lead Pipeline",
    desc: "Inbound capture & deals",
    icon: Target,
    color: "text-blue-400",
    bg: "from-blue-600/20 to-indigo-600/20",
    border: "border-blue-500/30",
  },
  {
    name: "HRMS & People",
    desc: "Attendance & leave sync",
    icon: Building2,
    color: "text-indigo-400",
    bg: "from-indigo-600/20 to-purple-600/20",
    border: "border-indigo-500/30",
  },
  {
    name: "Smart Invoicing",
    desc: "GST billing & payments",
    icon: Receipt,
    color: "text-emerald-400",
    bg: "from-emerald-600/20 to-teal-600/20",
    border: "border-emerald-500/30",
  },
  {
    name: "Connectors",
    desc: "8+ lead sources auto-sync",
    icon: Layers,
    color: "text-sky-400",
    bg: "from-sky-600/20 to-blue-600/20",
    border: "border-sky-500/30",
  },
  {
    name: "360° Analytics",
    desc: "Cross-team KPIs & ROI",
    icon: BarChart3,
    color: "text-amber-400",
    bg: "from-amber-600/20 to-orange-600/20",
    border: "border-amber-500/30",
  },
  {
    name: "Automation",
    desc: "Trigger-based actions",
    icon: Zap,
    color: "text-violet-400",
    bg: "from-violet-600/20 to-fuchsia-600/20",
    border: "border-violet-500/30",
  },
];

export function UnifiedPlatform() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
        defaults: { ease: "power3.out" },
      });

      // 1. Central Card Reveal
      tl.fromTo(
        ".platform-center-hub",
        { opacity: 0, scale: 0.92, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.4)" }
      );

      // 2. Converging Module Cards Stagger
      tl.fromTo(
        ".platform-module-node",
        { opacity: 0, y: 15, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08 },
        "-=0.4"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-3xl border border-border/80 bg-surface/50 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-2xl shadow-black/30 overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/15 blur-3xl rounded-full -z-10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="space-y-8">
        {/* Central Platform Hero Card */}
        <div className="platform-center-hub mx-auto max-w-xl text-center space-y-4 rounded-2xl border-2 border-primary/40 bg-surface-elevated/90 p-6 sm:p-8 shadow-xl shadow-primary/15 relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>ONE SOURCE OF TRUTH</span>
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
              <span className="text-primary font-mono font-black text-xl">◈</span>
              NEXORA 360° Platform
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Sales, workforce, billing, and connected data synchronized in real-time.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 border-t border-border/50 text-[11px] text-muted-foreground font-mono">
            <span>✓ Zero Context Switching</span>
            <span>•</span>
            <span>✓ Unified Permissions</span>
            <span>•</span>
            <span>✓ Real-time Sync</span>
          </div>
        </div>

        {/* 6 Converging Business Module Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {PLATFORM_MODULES.map((mod) => (
            <div
              key={mod.name}
              className={cn(
                "platform-module-node rounded-xl border bg-card/80 p-3.5 space-y-2.5 transition-all duration-200",
                mod.border,
                "hover:border-primary/50 hover:bg-surface-elevated hover:-translate-y-0.5 shadow-sm"
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border/70",
                    mod.color
                  )}
                >
                  <mod.icon className="h-4 w-4" />
                </div>
                <Sparkles className="h-3 w-3 text-muted-foreground/40" />
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  {mod.name}
                </h4>
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {mod.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
