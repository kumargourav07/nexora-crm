"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { name: "Lead", value: "₹0L", status: "Inbound" },
  { name: "Qualified", value: "₹2.4L", status: "Verified" },
  { name: "Proposal", value: "₹3.5L", status: "Sent" },
  { name: "Won", value: "₹5.8L", status: "Closed" },
  { name: "Invoiced", value: "₹5.8L", status: "Paid" },
];

export function LeadRevenueFlow() {
  return (
    <div className="w-full space-y-3 rounded-xl border border-border/70 bg-surface/70 p-4">
      <div className="flex items-center justify-between text-xs pb-1 border-b border-border/50">
        <span className="font-semibold text-foreground">Lead-to-Revenue Lifecycle</span>
        <span className="text-[10px] font-mono text-emerald-400 font-bold">
          3.2x Faster Cycle
        </span>
      </div>

      {/* Horizontal on Desktop, Vertical/Wrap on Mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {STAGES.map((stage, idx) => (
          <div
            key={stage.name}
            className={cn(
              "rounded-lg border p-2 space-y-1 relative transition-all duration-200",
              idx === 4
                ? "border-emerald-500/40 bg-emerald-500/10"
                : idx === 3
                ? "border-primary/40 bg-primary/10"
                : "border-border/60 bg-card/60"
            )}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-mono text-muted-foreground">0{idx + 1}</span>
              {idx === 4 ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : (
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>

            <p className="text-xs font-semibold text-foreground">{stage.name}</p>
            <div className="flex items-center justify-between text-[9px] pt-0.5">
              <span className="text-muted-foreground font-medium">{stage.status}</span>
              <span className="font-mono font-bold text-primary">{stage.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
