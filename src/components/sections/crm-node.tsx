import * as React from "react";
import { Sparkles, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrmNodeProps {
  className?: string;
  isPulsing?: boolean;
}

export function CrmNode({ className, isPulsing = true }: CrmNodeProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer Glow Ring */}
      <div
        className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-primary/25 via-sky-400/20 to-primary/25 blur-xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Center Node Card */}
      <div className="relative rounded-2xl border-2 border-primary/50 bg-surface-elevated/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-primary/20 text-center space-y-3 min-w-[200px] sm:min-w-[240px] max-w-[280px]">
        {/* Top Tag */}
        <div className="flex items-center justify-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {isPulsing && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
            ACTIVE PIPELINE
          </span>
        </div>

        {/* Brand Icon & Name */}
        <div className="space-y-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black font-mono text-base shadow-md shadow-primary/30">
            ◈
          </div>
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
            NEXORA CRM
          </h3>
          <p className="text-xs font-medium text-primary flex items-center justify-center gap-1">
            <Layers className="h-3 w-3" />
            360° Business Hub
          </p>
        </div>

        {/* Subtitle Badge */}
        <div className="border-t border-border/60 pt-2.5">
          <p className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            All leads. One pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
