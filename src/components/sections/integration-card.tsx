"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Integration } from "@/lib/constants/integrations";

interface IntegrationCardProps {
  integration: Integration;
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border bg-card/70 p-5 transition-colors",
        "border-border/70 hover:border-primary/40 hover:bg-surface-elevated/80 shadow-md shadow-black/10"
      )}
    >
      <div className="space-y-3">
        {/* Top Icon & Category */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr text-xs font-bold text-white shadow-sm",
              integration.avatarBg
            )}
          >
            {integration.shortName}
          </div>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground border border-border/60">
            {integration.category}
          </span>
        </div>

        {/* Name & Description */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {integration.name}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {integration.description}
          </p>
        </div>
      </div>

      {/* Footer Status & Arrow */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-400">
          <Check className="h-3 w-3" />
          {integration.status}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
          <span>Auto-sync</span>
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </motion.div>
  );
}
