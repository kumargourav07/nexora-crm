import * as React from "react";
import { Zap, Bot, Mail, CheckCircle2 } from "lucide-react";

const AUTO_STEPS = [
  { label: "New Lead Intake", sub: "Meta / Webhook", icon: Zap },
  { label: "Smart Auto-Routing", sub: "Rep Availability", icon: Bot },
  { label: "Instant WhatsApp", sub: "Follow-up Trigger", icon: Mail },
  { label: "Deal Won & Invoice", sub: "Auto-GST Billing", icon: CheckCircle2 },
];

export function AutomationFlow() {
  return (
    <div className="w-full space-y-2 rounded-xl border border-border/70 bg-surface/70 p-3.5">
      <div className="flex items-center justify-between text-xs pb-1 border-b border-border/50">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Zero-Touch Workflow Engine
        </span>
        <span className="text-[10px] font-mono text-emerald-400 font-semibold">
          99.4% Automated
        </span>
      </div>

      <div className="space-y-1.5 pt-1">
        {AUTO_STEPS.map((step, idx) => (
          <div
            key={step.label}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-card/60 px-2.5 py-1.5 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-elevated text-primary text-[10px] font-mono font-bold">
                0{idx + 1}
              </span>
              <div>
                <p className="font-semibold text-foreground text-[11px] leading-tight">
                  {step.label}
                </p>
                <p className="text-[9px] text-muted-foreground">{step.sub}</p>
              </div>
            </div>
            <step.icon className="h-3.5 w-3.5 text-primary shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
