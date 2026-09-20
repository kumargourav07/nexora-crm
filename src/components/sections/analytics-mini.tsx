import * as React from "react";
import { TrendingUp, ArrowUpRight } from "lucide-react";

export function AnalyticsMini() {
  return (
    <div className="w-full space-y-3 rounded-xl border border-border/70 bg-surface/70 p-4">
      <div className="flex items-center justify-between text-xs pb-1 border-b border-border/50">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Cross-Department Velocity
        </span>
        <span className="text-[10px] font-mono text-emerald-400 font-semibold">
          Live Real-time
        </span>
      </div>

      {/* 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/50 bg-card/70 p-2 space-y-0.5">
          <span className="text-[10px] text-muted-foreground">Revenue Run-rate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground">₹8.4M</span>
            <span className="text-[9px] font-semibold text-emerald-400 flex items-center">
              <ArrowUpRight className="h-2 w-2" /> +12.5%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-card/70 p-2 space-y-0.5">
          <span className="text-[10px] text-muted-foreground">Active Leads</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground">12,482</span>
            <span className="text-[9px] font-semibold text-emerald-400 flex items-center">
              <ArrowUpRight className="h-2 w-2" /> +18.2%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-card/70 p-2 space-y-0.5">
          <span className="text-[10px] text-muted-foreground">Conversion</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground">32.8%</span>
            <span className="text-[9px] font-semibold text-emerald-400 flex items-center">
              <ArrowUpRight className="h-2 w-2" /> +4.6%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-card/70 p-2 space-y-0.5">
          <span className="text-[10px] text-muted-foreground">Team Velocity</span>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground">96%</span>
            <span className="text-[9px] font-semibold text-primary font-mono">
              Synced
            </span>
          </div>
        </div>
      </div>

      {/* Mini SVG Sparkline */}
      <div className="relative h-8 w-full">
        <svg viewBox="0 0 300 40" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="miniSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M 0,35 Q 50,30 100,22 T 200,15 T 300,5 L 300,40 L 0,40 Z"
            fill="url(#miniSpark)"
          />
          <path
            d="M 0,35 Q 50,30 100,22 T 200,15 T 300,5"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
