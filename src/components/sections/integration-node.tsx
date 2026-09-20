import * as React from "react";
import { cn } from "@/lib/utils";
import type { Integration } from "@/lib/constants/integrations";

interface IntegrationNodeProps {
  integration: Integration;
  className?: string;
  isActive?: boolean;
}

export function IntegrationNode({
  integration,
  className,
  isActive = false,
}: IntegrationNodeProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border bg-surface/90 backdrop-blur-md p-3 transition-all duration-200 select-none shadow-md",
        integration.accentBorder,
        isActive
          ? "border-primary bg-surface-elevated shadow-primary/20 scale-105"
          : "border-border/70 hover:border-border-strong hover:bg-surface-elevated hover:scale-102",
        className
      )}
    >
      {/* Branded Initials / Avatar Icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr text-xs font-bold text-white shadow-sm",
          integration.avatarBg
        )}
      >
        {integration.shortName}
      </div>

      {/* Text Info */}
      <div className="space-y-0.5 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-foreground truncate">
            {integration.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground uppercase">
            {integration.category}
          </span>
          <span className="text-[9px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            {integration.status}
          </span>
        </div>
      </div>
    </div>
  );
}
