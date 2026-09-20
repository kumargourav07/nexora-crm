import * as React from "react";
import { Users, Building, ShieldCheck, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  { stage: "01", name: "Small Sales Team", cap: "1–10 Reps", icon: Users, width: "w-full" },
  { stage: "02", name: "Growing Org", cap: "10–50 Headcount", icon: Building, width: "w-full" },
  { stage: "03", name: "Multi-Team Ops", cap: "HR + Finance Sync", icon: ShieldCheck, width: "w-full" },
  { stage: "04", name: "Connected Enterprise", cap: "Unlimited Pipelines", icon: Globe, width: "w-full" },
];

export function ScaleVisual() {
  return (
    <div className="w-full space-y-2 rounded-xl border border-border/70 bg-surface/70 p-3.5">
      <div className="flex items-center justify-between text-xs pb-1 border-b border-border/50">
        <span className="font-semibold text-foreground">Progressive Scalability</span>
        <span className="text-[10px] font-mono text-primary font-bold">1 to 500+ Seats</span>
      </div>

      <div className="space-y-1.5 pt-1">
        {TIERS.map((tier, idx) => (
          <div
            key={tier.name}
            className={cn(
              "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
              idx === 3
                ? "border-primary/40 bg-primary/10"
                : "border-border/50 bg-card/60"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground font-bold">
                {tier.stage}
              </span>
              <div>
                <p className="font-semibold text-foreground text-[11px] leading-tight">
                  {tier.name}
                </p>
                <p className="text-[9px] text-muted-foreground">{tier.cap}</p>
              </div>
            </div>
            <tier.icon className="h-3.5 w-3.5 text-primary shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
